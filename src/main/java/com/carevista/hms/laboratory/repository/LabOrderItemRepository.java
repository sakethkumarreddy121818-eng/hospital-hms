package com.carevista.hms.laboratory.repository;

import com.carevista.hms.laboratory.entity.LabOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabOrderItemRepository extends JpaRepository<LabOrderItem, Long> {
    List<LabOrderItem> findByLabOrderId(Long labOrderId);
}
