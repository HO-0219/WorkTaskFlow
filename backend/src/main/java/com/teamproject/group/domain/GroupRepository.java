package com.teamproject.group.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {
    boolean existsByTypeAndCreatedById(Group.Type type, Long userId);
    boolean existsByJoinCode(String joinCode);
    Optional<Group> findByJoinCodeIgnoreCase(String joinCode);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from Group g where g.id = :id")
    Optional<Group> findByIdForUpdate(@Param("id") Long id);
}
