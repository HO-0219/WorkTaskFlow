package com.teamproject.common.presentation.error;

import com.teamproject.common.exception.ApplicationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.LinkedHashMap;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ApplicationException.class)
    ResponseEntity<ApiError> application(ApplicationException e) {
        return ResponseEntity.status(e.status()).body(new ApiError(e.code(), e.getMessage(), null));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException e) {
        var fields = new LinkedHashMap<String, String>();
        e.getBindingResult().getFieldErrors().forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_FAILED", "입력값을 확인해 주세요.", fields));
    }
    @ExceptionHandler({HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiError> invalidRequest(Exception e) {
        return ResponseEntity.badRequest().body(new ApiError("INVALID_REQUEST",
                "요청 형식과 필수 입력값을 확인해 주세요.", null));
    }
    @ExceptionHandler(OptimisticLockingFailureException.class)
    ResponseEntity<ApiError> optimisticLock(OptimisticLockingFailureException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("TASK_VERSION_CONFLICT",
                "업무가 이미 변경되었습니다. 새로고침 후 다시 시도해 주세요.", null));
    }
}
