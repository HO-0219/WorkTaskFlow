package com.teamproject.group.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GroupRepository extends JpaRepository<Group, Long> {
    boolean existsByTypeAndCreatedById(Group.Type type, Long userId);
    boolean existsByJoinCodeHash(String joinCodeHash);
    Optional<Group> findByJoinCodeHash(String joinCodeHash);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from Group g where g.id = :id")
    Optional<Group> findByIdForUpdate(@Param("id") Long id);
    List<Group> findAllByTypeOrderByCreatedAtDesc(Group.Type type);
    Page<Group> findAllByOrderByCreatedAtDesc(Pageable pageable);
    /** 지금 결제가 유효한 팀 그룹만. AI 비서 같은 유료 전용 기능의 백그라운드 작업 대상을 고를 때 쓴다. */
    List<Group> findAllByTypeAndMembershipPlanAndPaidUntilAfter(
            Group.Type type, Group.MembershipPlan membershipPlan, LocalDateTime now);
}
