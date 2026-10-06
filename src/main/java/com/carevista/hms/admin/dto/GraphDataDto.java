package com.carevista.hms.admin.dto;

import java.util.ArrayList;
import java.util.List;

public class GraphDataDto {
    private String period; // ONE_DAY, ONE_WEEK, ONE_MONTH, ONE_YEAR, LIFETIME
    private String metric; // OP, IP, PHARMACY, LAB, COLLECTION
    private List<String> labels = new ArrayList<>();
    private List<Double> values = new ArrayList<>();
    private double total = 0.0;
    private String unit = "";

    public GraphDataDto() {}

    public GraphDataDto(String period, String metric, List<String> labels, List<Double> values, double total, String unit) {
        this.period = period;
        this.metric = metric;
        this.labels = labels;
        this.values = values;
        this.total = total;
        this.unit = unit;
    }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }

    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }

    public List<String> getLabels() { return labels; }
    public void setLabels(List<String> labels) { this.labels = labels; }

    public List<Double> getValues() { return values; }
    public void setValues(List<Double> values) { this.values = values; }

    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
}
