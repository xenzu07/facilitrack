import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import 'dart:typed_data';

class CreateReportScreen extends StatefulWidget {
  const CreateReportScreen({super.key});

  @override
  State<CreateReportScreen> createState() => _CreateReportScreenState();
}

class _CreateReportScreenState extends State<CreateReportScreen> {
  final descCtrl = TextEditingController();

  List<Map<String, dynamic>> locations = [];
  List<Map<String, dynamic>> categories = [];
  List<String> urgencies = [];
  bool loading = true;
  bool submitting = false;
  String? loadError;

  String? building;
  String? floor;
  String? locationId;
  String? categoryId;
  String urgency = 'MEDIUM';
  XFile? photo;
  Uint8List? photoBytes;

  @override
  void initState() {
    super.initState();
    descCtrl.addListener(() => setState(() {}));
    loadOptions();
  }

  @override
  void dispose() {
    descCtrl.dispose();
    super.dispose();
  }

  Future<void> loadOptions() async {
    setState(() {
      loading = true;
      loadError = null;
    });
    try {
      final res = await ApiClient.instance.dio.get('/reports/options');
      locations = List<Map<String, dynamic>>.from(res.data['locations']);
      categories = List<Map<String, dynamic>>.from(res.data['categories']);
      urgencies = List<String>.from(res.data['urgencies']);
    } catch (e) {
      loadError = errorMessage(e);
    }
    if (mounted) setState(() => loading = false);
  }

  List<String> get buildings =>
      (locations.map((l) => l['building'] as String).toSet().toList()..sort());

  List<String> get floors => (locations
      .where((l) => l['building'] == building)
      .map((l) => l['floor'] as String)
      .toSet()
      .toList()
    ..sort());

  List<Map<String, dynamic>> get rooms => locations
      .where((l) => l['building'] == building && l['floor'] == floor)
      .toList();

  String? get routedUnit {
    if (categoryId == null) return null;
    final c = categories.firstWhere((c) => c['id'] == categoryId);
    return c['defaultTradeUnit']?['name'];
  }

  bool get canSubmit =>
      !submitting &&
      locationId != null &&
      categoryId != null &&
      descCtrl.text.trim().length >= 5 &&
      photo != null;

  Future<void> pickPhoto(ImageSource source) async {
    // resizing and quality keep uploads small for campus bandwidth (mobile only)
    final x = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1600,
      maxHeight: 1600,
      imageQuality: 70,
    );
    if (x == null) return;
    final bytes = await x.readAsBytes();
    setState(() {
      photo = x;
      photoBytes = bytes;
    });
  }

  Future<void> submit() async {
    if (photo == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('A photo is required.')));
      return;
    }
    setState(() => submitting = true);
    try {
      final isPng = photo!.name.toLowerCase().endsWith('.png');
      final ext = isPng ? 'png' : 'jpg';
      final mime = isPng ? 'image/png' : 'image/jpeg';
      final form = FormData.fromMap({
        'locationId': locationId,
        'categoryId': categoryId,
        'urgency': urgency,
        'description': descCtrl.text.trim(),
        'photo': MultipartFile.fromBytes(
          photoBytes!,
          filename: 'photo.$ext',
          contentType: DioMediaType.parse(mime),
        ),
      });
      await ApiClient.instance.dio.post('/reports', data: form);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Report submitted.')));
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessage(e))));
      setState(() => submitting = false);
    }
  }

  InputDecoration _dec(String label) =>
      InputDecoration(labelText: label, border: const OutlineInputBorder());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Report')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : loadError != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(loadError!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton(
                            onPressed: loadOptions, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    DropdownButtonFormField<String>(
                      value: building,
                      decoration: _dec('Building'),
                      items: buildings
                          .map((b) => DropdownMenuItem(value: b, child: Text(b)))
                          .toList(),
                      onChanged: (v) => setState(() {
                        building = v;
                        floor = null;
                        locationId = null;
                      }),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      key: ValueKey('floor-$building'),
                      value: floor,
                      decoration: _dec('Floor'),
                      items: floors
                          .map((f) => DropdownMenuItem(value: f, child: Text(f)))
                          .toList(),
                      onChanged: building == null
                          ? null
                          : (v) => setState(() {
                                floor = v;
                                locationId = null;
                              }),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      key: ValueKey('room-$building-$floor'),
                      value: locationId,
                      decoration: _dec('Room'),
                      items: rooms
                          .map((l) => DropdownMenuItem(
                              value: l['id'] as String,
                              child: Text(l['room'] as String)))
                          .toList(),
                      onChanged: floor == null
                          ? null
                          : (v) => setState(() => locationId = v),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: categoryId,
                      isExpanded: true,
                      decoration: _dec('Issue category'),
                      items: categories
                          .map((c) => DropdownMenuItem(
                              value: c['id'] as String,
                              child: Text(c['name'] as String)))
                          .toList(),
                      onChanged: (v) => setState(() => categoryId = v),
                    ),
                    if (routedUnit != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 6, left: 4),
                        child: Text('Will be routed to: $routedUnit',
                            style: const TextStyle(color: Colors.grey)),
                      ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: urgency,
                      decoration: _dec('Urgency'),
                      items: urgencies
                          .map((u) => DropdownMenuItem(
                              value: u, child: Text(urgencyLabel(u))))
                          .toList(),
                      onChanged: (v) => setState(() => urgency = v ?? 'MEDIUM'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descCtrl,
                      maxLines: 4,
                      decoration: _dec('Description (at least 5 characters)'),
                    ),
                    const SizedBox(height: 16),
                    const Text('Photo (required)',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => pickPhoto(ImageSource.camera),
                            icon: const Icon(Icons.photo_camera),
                            label: const Text('Camera'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => pickPhoto(ImageSource.gallery),
                            icon: const Icon(Icons.photo_library),
                            label: const Text('Gallery'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (photo != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.memory(photoBytes!, 
                        height: 200, fit: BoxFit.cover),
                      )
                    else
                      const Text('No photo selected yet.',
                          style: TextStyle(color: Colors.red)),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: canSubmit ? submit : null,
                      icon: submitting
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.send),
                      label: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text('Submit report'),
                      ),
                    ),
                  ],
                ),
    );
  }
}