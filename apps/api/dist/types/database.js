"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.QuotaError = exports.TenantError = void 0;
class TenantError extends Error {
    constructor(message, code = 'TENANT_ERROR') {
        super(message);
        this.code = code;
        this.name = 'TenantError';
    }
}
exports.TenantError = TenantError;
class QuotaError extends Error {
    constructor(message, quotaType, limit, current) {
        super(message);
        this.quotaType = quotaType;
        this.limit = limit;
        this.current = current;
        this.name = 'QuotaError';
    }
}
exports.QuotaError = QuotaError;
class ValidationError extends Error {
    constructor(message, field, value) {
        super(message);
        this.field = field;
        this.value = value;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
