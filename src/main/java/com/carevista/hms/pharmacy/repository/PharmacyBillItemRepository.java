package com.carevista.hms.pharmacy.repository;

import com.carevista.hms.pharmacy.entity.PharmacyBillItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PharmacyBillItemRepository extends JpaRepository<PharmacyBillItem, Long> {
    List<PharmacyBillItem> findByBillId(Long billId);
}
