

class ApiResponse {
    constructor(statusCode, message = 'Success', data = null, errors = []) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.errors = errors;
        this.success = statusCode < 400; // ✅ Correct variable name
    }
}

export { ApiResponse };
