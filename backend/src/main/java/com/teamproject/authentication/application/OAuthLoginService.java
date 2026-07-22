package com.teamproject.authentication.application;

import com.teamproject.authentication.domain.oauth.SocialAccount;
import com.teamproject.authentication.domain.oauth.SocialAccountRepository;
import com.teamproject.common.exception.ApplicationException;
import com.teamproject.group.application.PersonalGroupProvisioner;
import com.teamproject.user.domain.User;
import com.teamproject.user.domain.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class OAuthLoginService {
    private final UserRepository users;
    private final SocialAccountRepository socialAccounts;
    private final AccessSessionIssuer issuer;
    private final PersonalGroupProvisioner personalGroups;

    public OAuthLoginService(UserRepository users, SocialAccountRepository socialAccounts,
            AccessSessionIssuer issuer, PersonalGroupProvisioner personalGroups) {
        this.users = users;
        this.socialAccounts = socialAccounts;
        this.issuer = issuer;
        this.personalGroups = personalGroups;
    }

    @Transactional
    public IssuedTokens login(String provider, String subject, String rawEmail, String name) {
        return socialAccounts.findByProviderAndProviderSubject(provider, subject)
                .map(SocialAccount::getUser)
                .map(user -> {
                    user.recordLogin();
                    return issuer.issue(user);
                })
                .orElseGet(() -> create(provider, subject, rawEmail, name));
    }

    private IssuedTokens create(String provider, String subject, String rawEmail, String name) {
        if (rawEmail == null || rawEmail.isBlank()) {
            throw new ApplicationException("SOCIAL_EMAIL_REQUIRED", HttpStatus.BAD_REQUEST,
                    "소셜 계정의 이메일 제공 동의가 필요합니다.");
        }
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApplicationException("SOCIAL_ACCOUNT_LINK_REQUIRED", HttpStatus.CONFLICT,
                    "같은 이메일의 기존 계정이 있습니다. 로그인 후 계정 연결이 필요합니다.");
        }
        User user = users.save(User.social(availableUsername(email), email, cleanName(name)));
        personalGroups.createFor(user);
        socialAccounts.save(new SocialAccount(user, provider, subject));
        user.recordLogin();
        return issuer.issue(user);
    }

    private String availableUsername(String email) {
        String base = email.substring(0, email.indexOf('@')).replaceAll("[^a-zA-Z0-9_]", "");
        if (base.length() < 4) base = "user" + base;
        if (base.length() > 16) base = base.substring(0, 16);
        String candidate = base.toLowerCase(Locale.ROOT);
        int suffix = 1;
        while (users.existsByUsernameIgnoreCase(candidate)) candidate = base + suffix++;
        return candidate;
    }

    private String cleanName(String name) { return name == null || name.isBlank() ? "사용자" : name.trim(); }
}
