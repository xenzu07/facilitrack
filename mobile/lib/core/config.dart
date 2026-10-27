import 'package:flutter/foundation.dart';

class AppConfig {
  // Android emulator: 10.0.2.2 reaches your PC.
  // Real phone: replace with your PC's IPv4, e.g. 'http://192.168.1.15:3000'
  static const String _mobileUrl = 'http://192.168.1.12:3000';

  static String get baseUrl => kIsWeb ? 'http://localhost:3000' : _mobileUrl;
}