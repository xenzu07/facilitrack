import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/auth_provider.dart';

class PlaceholderHome extends StatelessWidget {
  final String title;
  final String message;
  const PlaceholderHome({super.key, required this.title, required this.message});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: auth.logout,
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Signed in as ${auth.user?.fullName}\n\n$message',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}