package com.teamproject.auth.user;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(name = "uk_users_username", columnNames = "username"),
        @UniqueConstraint(name = "uk_users_email", columnNames = "email")
})
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 40)
    private String username;
    @Column(nullable = false, length = 255)
    private String email;
    @Column(length = 255)
    private String passwordHash;
    @Column(nullable = false, length = 60)
    private String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Role role = Role.USER;
    @Column(nullable = false)
    private boolean emailVerified;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime lastLoginAt;

    protected User() {}

    public User(String username, String email, String passwordHash, String name, boolean emailVerified) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.emailVerified = emailVerified;
    }

    public static User social(String username, String email, String name) {
        return new User(username, email, null, name, true);
    }

    public void changePassword(String passwordHash) { this.passwordHash = passwordHash; }
    public void recordLogin() { this.lastLoginAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public Role getRole() { return role; }
    public boolean isEmailVerified() { return emailVerified; }

    public enum Role { USER, ADMIN }
}

