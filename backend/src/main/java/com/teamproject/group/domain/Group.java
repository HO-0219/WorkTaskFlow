package com.teamproject.group.domain;

import com.teamproject.user.domain.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_groups")
public class Group {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Type type;
    @Column(nullable = false, length = 80)
    private String name;
    @Column(length = 500)
    private String description;
    @Column(nullable = false, length = 50)
    private String timezone;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private DashboardVisibility dashboardVisibility;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private MembershipPlan membershipPlan;
    @Column(length = 12, unique = true)
    private String joinCode;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected Group() {}

    private Group(Type type, String name, String description, String timezone,
            DashboardVisibility dashboardVisibility, MembershipPlan membershipPlan,
            String joinCode, User createdBy) {
        this.type = type;
        this.name = name;
        this.description = description;
        this.timezone = timezone;
        this.dashboardVisibility = dashboardVisibility;
        this.membershipPlan = membershipPlan;
        this.joinCode = joinCode;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = createdAt;
    }

    public static Group personal(User owner) {
        return new Group(Type.PERSONAL, owner.getNickname() + "의 개인 일정", null,
                "Asia/Seoul", DashboardVisibility.MEMBERS, MembershipPlan.FREE, null, owner);
    }

    public static Group team(String name, String description, String timezone, User creator) {
        return team(name, description, timezone, null, creator);
    }

    public static Group team(String name, String description, String timezone, String joinCode, User creator) {
        return new Group(Type.TEAM, name, description, timezone,
                DashboardVisibility.MEMBERS, MembershipPlan.FREE, joinCode, creator);
    }

    public void updateSettings(String name, String description, String timezone,
            DashboardVisibility dashboardVisibility) {
        this.name = name;
        this.description = description;
        this.timezone = timezone;
        this.dashboardVisibility = dashboardVisibility;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Type getType() { return type; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getTimezone() { return timezone; }
    public DashboardVisibility getDashboardVisibility() { return dashboardVisibility; }
    public MembershipPlan getMembershipPlan() { return membershipPlan; }
    public String getJoinCode() { return joinCode; }
    public User getCreatedBy() { return createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public enum Type { PERSONAL, TEAM }
    public enum DashboardVisibility { LEADER_ONLY, MEMBERS }
    public enum MembershipPlan { FREE, PAID }
}
