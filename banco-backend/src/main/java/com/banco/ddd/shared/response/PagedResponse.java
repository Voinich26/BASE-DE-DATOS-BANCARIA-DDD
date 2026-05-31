package com.banco.ddd.shared.response;

import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Wrapper de paginación para respuestas de listas.
 */
@Getter
public class PagedResponse<T> {

    private final List<T> content;
    private final int     page;
    private final int     size;
    private final long    totalElements;
    private final int     totalPages;
    private final boolean last;

    public PagedResponse(Page<T> page) {
        this.content       = page.getContent();
        this.page          = page.getNumber();
        this.size          = page.getSize();
        this.totalElements = page.getTotalElements();
        this.totalPages    = page.getTotalPages();
        this.last          = page.isLast();
    }

    public PagedResponse(List<T> content, int page, int size, long totalElements) {
        this.content       = content;
        this.page          = page;
        this.size          = size;
        this.totalElements = totalElements;
        this.totalPages    = (int) Math.ceil((double) totalElements / size);
        this.last          = (page + 1) >= this.totalPages;
    }
}
