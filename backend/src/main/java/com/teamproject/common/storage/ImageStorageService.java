package com.teamproject.common.storage;

import com.teamproject.common.exception.ApplicationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class ImageStorageService {
    private static final Set<String> ALLOWED_FORMATS = Set.of("jpeg", "jpg", "png", "gif");
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final int MAX_DIMENSION = 4096;
    private final Path root;

    public ImageStorageService(@Value("${app.storage.local-root:uploads}") String root) {
        this.root = Path.of(root).toAbsolutePath().normalize();
    }

    public String store(MultipartFile file, String category) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw invalid("5MB 이하의 이미지 파일을 선택해 주세요.");
        }
        ImageInfo image = inspect(file);
        String safeCategory = Set.of("profiles", "groups").contains(category) ? category : "images";
        String extension = image.format().equals("jpeg") || image.format().equals("jpg") ? "jpg" : image.format();
        Path directory = root.resolve(safeCategory).normalize();
        Path target = directory.resolve(UUID.randomUUID() + "." + extension).normalize();
        if (!target.startsWith(directory)) throw invalid("올바르지 않은 파일 이름입니다.");
        try (InputStream input = file.getInputStream()) {
            Files.createDirectories(directory);
            Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + safeCategory + "/" + target.getFileName();
        } catch (IOException exception) {
            throw new ApplicationException("IMAGE_STORAGE_FAILED", HttpStatus.INTERNAL_SERVER_ERROR,
                    "이미지를 저장하지 못했습니다.");
        }
    }

    public void deleteManaged(String url) {
        if (url == null || !url.startsWith("/uploads/")) return;
        Path target = root.resolve(url.substring("/uploads/".length())).normalize();
        if (!target.startsWith(root)) return;
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // Replacement remains successful; an operational cleanup job can remove an orphan later.
        }
    }

    public void deleteManagedAfterCommit(String url) {
        if (url == null) return;
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            deleteManaged(url);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { deleteManaged(url); }
        });
    }

    private ImageInfo inspect(MultipartFile file) {
        try (ImageInputStream input = ImageIO.createImageInputStream(file.getInputStream())) {
            if (input == null) throw invalid("올바른 이미지 파일이 아닙니다.");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalid("JPG, PNG 또는 GIF 이미지만 사용할 수 있습니다.");
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (!ALLOWED_FORMATS.contains(format) || width < 1 || height < 1
                        || width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    throw invalid("4096px 이하의 JPG, PNG 또는 GIF 이미지만 사용할 수 있습니다.");
                }
                return new ImageInfo(format);
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw invalid("이미지 파일을 확인할 수 없습니다.");
        }
    }

    private ApplicationException invalid(String message) {
        return new ApplicationException("IMAGE_INVALID", HttpStatus.BAD_REQUEST, message);
    }

    private record ImageInfo(String format) {}
}
