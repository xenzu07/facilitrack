import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/nav.dart';
import 'features/auth/auth_provider.dart';
import 'features/auth/login_screen.dart';
import 'features/home/placeholder_home.dart';
import 'features/reports/my_reports_screen.dart';
import 'features/jobs/my_jobs_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: const FacilitrackApp(),
    ),
  );
}

class FacilitrackApp extends StatelessWidget {
  const FacilitrackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FACILITRACK',
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF1B5E20),
        useMaterial3: true,
      ),
      home: const Gate(),
    );
  }
}

// shows the right home screen for the signed-in role
class Gate extends StatelessWidget {
  const Gate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final user = auth.user;
    if (user == null) return const LoginScreen();

    switch (user.role) {
      case 'REPORTER':
        return const MyReportsScreen();
      case 'TECHNICIAN':
        return const MyJobsScreen();
      default:
        return const PlaceholderHome(
          title: 'Administration',
          message: 'Coordinators and administrators use the web dashboard.',
        );
    }
  }
}