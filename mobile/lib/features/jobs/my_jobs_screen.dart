import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../auth/auth_provider.dart';
import 'job_detail_screen.dart';

class MyJobsScreen extends StatefulWidget {
  const MyJobsScreen({super.key});

  @override
  State<MyJobsScreen> createState() => _MyJobsScreenState();
}

class _MyJobsScreenState extends State<MyJobsScreen> {
  List<dynamic> jobs = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final res = await ApiClient.instance.dio.get('/job-orders/assigned');
      final list = List<dynamic>.from(res.data as List);
      // active jobs first, completed ones last
      const order = {'ASSIGNED': 0, 'IN_PROGRESS': 1, 'COMPLETED': 2};
      list.sort((a, b) =>
          (order[a['status']] ?? 9).compareTo(order[b['status']] ?? 9));
      jobs = list;
    } catch (e) {
      error = errorMessage(e);
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Jobs'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: load),
          IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Sign out',
              onPressed: auth.logout),
        ],
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
    if (jobs.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('No jobs assigned to you yet.', textAlign: TextAlign.center),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: jobs.length,
        itemBuilder: (_, i) {
          final j = jobs[i];
          final r = j['report'];
          final loc = r['location'];
          return Card(
            child: ListTile(
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => JobDetailScreen(jobId: j['id'])),
                );
                load();
              },
              title: Text('${j['jobOrderNo']}  ·  ${r['category']['name']}',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                    '${loc['building']}, ${loc['floor']}, ${loc['room']}\n'
                    'Urgency: ${urgencyLabel(r['urgency'])}'),
              ),
              isThreeLine: true,
              trailing: StatusChip(j['status']),
            ),
          );
        },
      ),
    );
  }
}