import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'config.dart';

class ApiClient {
  ApiClient._() {
    dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
    ));
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (e, handler) {
        // expired or invalid session: send the user back to login
        if (e.response?.statusCode == 401 && token != null) {
          onUnauthorized?.call();
        }
        handler.next(e);
      },
    ));
  }

  static final ApiClient instance = ApiClient._();

  late final Dio dio;
  String? token;
  VoidCallback? onUnauthorized;
}

const _networkErrors = {
  DioExceptionType.connectionError,
  DioExceptionType.connectionTimeout,
  DioExceptionType.sendTimeout,
  DioExceptionType.receiveTimeout,
};

String errorMessage(Object e) {
  if (e is DioException) {
    if (_networkErrors.contains(e.type)) {
      return 'No internet connection or the server is unreachable. Please try again.';
    }
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      final m = data['message'];
      return m is List ? m.join('\n') : m.toString();
    }
  }
  return 'Something went wrong. Please try again.';
}