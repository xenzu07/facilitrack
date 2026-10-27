import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api_client.dart';
import '../../core/nav.dart';
import '../../core/realtime.dart';

class AuthUser {
  final String id;
  final String fullName;
  final String role;
  AuthUser({required this.id, required this.fullName, required this.role});

  factory AuthUser.fromJson(Map<String, dynamic> j) =>
      AuthUser(id: j['id'], fullName: j['fullName'], role: j['role']);

  Map<String, dynamic> toJson() => {'id': id, 'fullName': fullName, 'role': role};
}

class AuthProvider extends ChangeNotifier {
  AuthUser? user;
  bool loading = true;

  AuthProvider() {
    ApiClient.instance.onUnauthorized = logout;
    _restore();
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final saved = prefs.getString('user');
    if (token != null && saved != null) {
      ApiClient.instance.token = token;
      Realtime.instance.connect();
      user = AuthUser.fromJson(jsonDecode(saved));
    }
    loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final res = await ApiClient.instance.dio
        .post('/auth/login', data: {'email': email, 'password': password});
    final token = res.data['accessToken'] as String;
    final u = AuthUser.fromJson(res.data['user']);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('user', jsonEncode(u.toJson()));

    ApiClient.instance.token = token;
    Realtime.instance.connect();
    user = u;
    notifyListeners();
  }

  Future<void> logout() async {
    Realtime.instance.disconnect();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    ApiClient.instance.token = null;
    user = null;
    navigatorKey.currentState?.popUntil((r) => r.isFirst);
    notifyListeners();
  }
}