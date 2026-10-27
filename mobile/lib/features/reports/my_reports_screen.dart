import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../auth/auth_provider.dart';
import 'create_report_screen.dart';
import 'report_detail_screen.dart';
import 'dart:async';
import '../../core/realtime.dart';

class MyReportsScreen extends StatefulWidget {
  const MyReportsScreen({super.key});

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  List<dynamic> reports = [];
  bool loading = true;
  String? error;
  StreamSubscription<Map<String, dynamic>>? _sub;

  @override
  void initState() {
    super.initState();
    load();
    _sub = Realtime.instance.events.listen((_) {
      if (mounted) load(silent: true);
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        loading = true;
        error = null;
      });
    }
    try {
      final res = await ApiClient.instance.dio.get('/reports/mine');
      reports = res.data as List;
      error = null;
    } catch (e) {
      if (!silent) error = errorMessage(e);
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> openNewReport() async {
    final created = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const CreateReportScreen()),
    );
    if (created == true) load();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Reports'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: load),
          IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Sign out',
              onPressed: auth.logout),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: openNewReport,
        icon: const Icon(Icons.add_a_photo),
        label: const Text('New report'),
      ),
      body: _body(),
    );
  }

  Widget _body() {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(onPressed: load, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }
    if (reports.isEmpty) {
      return const Center(child: Text('No reports yet. Tap "New report" to submit one.'));
    }
    return RefreshIndicator(
      onRefresh: load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 96),
        itemCount: reports.length,
        itemBuilder: (_, i) {
          final r = reports[i];
          final loc = r['location'];
          return Card(
            child: ListTile(
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => ReportDetailScreen(reportId: r['id'])),
                );
                load();
              },
              title: Text(r['description'],
                  maxLines: 2, overflow: TextOverflow.ellipsis),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                    '${r['category']['name']}\n${loc['building']}, ${loc['floor']}, ${loc['room']}\n${formatDate(r['createdAt'])}'),
              ),
              isThreeLine: true,
              trailing: StatusChip(r['status']),
            ),
          );
        },
      ),
    );
  }
}