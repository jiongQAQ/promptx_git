package com.graduation.entity;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Orders实体类
 *
 * @author 系统生成
 * @since 2025-09-19
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("orders")
@ApiModel(value = "Orders对象", description = "Orders表")
public class Orders {

    @TableId(type = IdType.AUTO)
    @ApiModelProperty("订单ID")
    private Long id;

    @TableField("user_id")
    @ApiModelProperty("用户ID")
    private Long userId;

    @TableField("order_no")
    @ApiModelProperty("订单号")
    private String orderNo;

    @TableField("total_amount")
    @ApiModelProperty("订单总金额")
    private BigDecimal totalAmount;

    @TableField("order_status")
    @ApiModelProperty("【枚举】1=待付款;2=已付款;3=已发货;4=已完成;5=已取消")
    private Integer orderStatus;

    @TableField("pay_type")
    @ApiModelProperty("【枚举】1=微信支付;2=支付宝;3=银行卡")
    private Integer payType;

    @ApiModelProperty("订单备注")
    private String remark;

    @TableField("create_time")
    @ApiModelProperty("创建时间")
    private LocalDateTime createTime;

    @TableField("update_time")
    @ApiModelProperty("更新时间")
    private LocalDateTime updateTime;

    @TableField("is_deleted")
    @ApiModelProperty("是否删除")
    private Integer isDeleted;
}