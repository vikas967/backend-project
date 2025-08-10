class ApiResponse {
    constructor(statusCode, message = 'Success', data = null, errors = []) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = statuscode< 400; // Assuming status codes below 400 are successful

    }
}

export { ApiResponse };