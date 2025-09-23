package com.graduation.controller;

import com.graduation.entity.Orders;
import com.graduation.service.OrdersService;
import com.graduation.dto.OrdersQueryDTO;
import com.graduation.common.Result;
import com.graduation.common.PageResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * OrdersController
 *
 * @author 系统生成
 * @since 2025-09-19
 */
@Slf4j
@RestController
@RequestMapping("/api/orders")
@Tag(name = "Orders管理", description = "Orders相关接口")
public class OrdersController {

    @Autowired
    private OrdersService ordersService;

    /**
     * 创建Orders
     */
    @PostMapping("/create")
    @Operation(summary = "创建Orders")
    public Result<Void> create(@RequestBody @Valid Orders orders) {
        log.info("创建Orders: {}", orders);
        return ordersService.save(orders);
    }

    /**
     * 更新Orders
     */
    @PutMapping("/update")
    @Operation(summary = "更新Orders")
    public Result<Void> update(@RequestParam Long id,
                               @RequestBody Orders orders) {
        log.info("更新Orders: id={}, entity={}", id, orders);
        orders.setId(id);
        return ordersService.update(orders, id);
    }

    /**
     * 删除Orders
     */
    @DeleteMapping("/delete")
    @Operation(summary = "删除Orders")
    public Result<Void> delete(@RequestParam Long id) {
        log.info("删除Orders: id={}", id);
        return ordersService.deleteById(id);
    }

    /**
     * 查询Orders
     */
    @GetMapping("/get")
    @Operation(summary = "查询Orders")
    public Result<Orders> get(@RequestParam Long id) {
        log.info("查询Orders: id={}", id);
        return ordersService.getById(id);
    }

    /**
     * 分页查询Orders
     */
    @PostMapping("/list")
    @Operation(summary = "分页查询Orders")
    public Result<PageResult<Orders>> list(@RequestBody OrdersQueryDTO queryDTO) {
        log.info("分页查询Orders: {}", queryDTO);
        return ordersService.queryPage(queryDTO);
    }

    /**
     * 查询所有Orders
     */
    @GetMapping("/all")
    @Operation(summary = "查询所有Orders")
    public Result<List<Orders>> all() {
        log.info("查询所有Orders");
        return ordersService.list();
    }

    /**
     * 获取订单状态选项
     */
    @GetMapping("/orderStatus-options")
    @Operation(summary = "获取订单状态选项")
    public Result<Map<String, String>> getOrderStatusOptions() {
        log.info("获取订单状态选项");
        Map<String, String> map = new java.util.HashMap<>();
        map.put("1", "待付款");
        map.put("2", "已付款");
        map.put("3", "已发货");
        map.put("4", "已完成");
        map.put("5", "已取消");
        return Result.success(map);
    }

    /**
     * 获取支付类型选项
     */
    @GetMapping("/payType-options")
    @Operation(summary = "获取支付类型选项")
    public Result<Map<String, String>> getPayTypeOptions() {
        log.info("获取支付类型选项");
        Map<String, String> map = new java.util.HashMap<>();
        map.put("1", "微信支付");
        map.put("2", "支付宝");
        map.put("3", "银行卡");
        return Result.success(map);
    }
}