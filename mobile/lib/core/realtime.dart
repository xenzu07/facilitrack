import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_client.dart';
import 'config.dart';

class Realtime {
  Realtime._();
  static final Realtime instance = Realtime._();

  io.Socket? _socket;
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get events => _controller.stream;

  void connect() {
    final token = ApiClient.instance.token;
    if (token == null) return;
    disconnect();

    final s = io.io(
      AppConfig.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );
    s.on('report.statusChanged', (data) {
      if (data is Map) _controller.add(Map<String, dynamic>.from(data));
    });
    s.connect();
    _socket = s;
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }
}