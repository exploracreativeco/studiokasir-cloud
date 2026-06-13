'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Send, Save, Copy } from 'lucide-react'
import { PageHeader, StatCard, LoadingSpinner } from '@/components/shared'
import { useToast } from '@/components/ui/use-toast'
import { getMonthSheetName } from '@/lib/utils'

const GAS_CODE = `// StudioHub — Google Apps Script Webhook
// Paste ke Extensions > Apps Script, Deploy as Web App

const SPREADSHEET_ID = 'GANTI_DENGAN_SPREADSHEET_ID_KAMU';

const TX_HEADERS = [
  'Tanggal', 'No Invoice', 'Customer', 'Paket', 'Fotografer',
  'Jml Orang', 'Subtotal', 'Diskon', 'DP', 'Sisa',
  'Grand Total', 'Biaya Ops', 'Profit', 'Metode', 'Status',
  'Kasir', 'Catatan'
];

const EXP_HEADERS = [
  'Tanggal', 'Judul', 'Kategori', 'Jumlah', 'Catatan'
];

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.type === 'ping') {
      return jsonResponse({ ok: true, message: 'Webhook StudioHub aktif!' });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (data.type === 'transaction') {
      const sheetName = getSheetName(data.date);
      const sheet = getOrCreateSheet(ss, sheetName, TX_HEADERS, '#1a56db');

      if (isDuplicate(sheet, data.invoiceNumber, 1)) {
        return jsonResponse({ ok: false, duplicate: true, message: 'Invoice sudah ada' });
      }

      sheet.appendRow([
        data.date, data.invoiceNumber, data.customer, data.package,
        data.fotografer || '-', data.jumlahOrang || '-',
        data.subtotal, data.discount, data.dp, data.sisa,
        data.total, data.biayaOps || 0,
        (data.total || 0) - (data.biayaOps || 0),
        data.method, data.status, data.cashier, data.notes || ''
      ]);

      // Color row based on status
      const lastRow = sheet.getLastRow();
      const statusCell = sheet.getRange(lastRow, 15);
      if (data.status === 'LUNAS') {
        statusCell.setBackground('#d1fae5').setFontColor('#065f46');
      } else {
        statusCell.setBackground('#fef3c7').setFontColor('#92400e');
      }

      // Auto-update summary row
      updateSummary(sheet, TX_HEADERS.length);

      return jsonResponse({ ok: true, sheet: sheetName });
    }

    if (data.type === 'expense') {
      const sheetName = 'PENGELUARAN_' + getSheetName(data.date);
      const sheet = getOrCreateSheet(ss, sheetName, EXP_HEADERS, '#dc2626');

      sheet.appendRow([data.date, data.title, data.category, data.amount, data.notes || '']);
      updateExpenseSummary(sheet);

      return jsonResponse({ ok: true, sheet: sheetName });
    }

    return jsonResponse({ ok: false, message: 'Unknown type' });

  } catch (err) {
    return jsonResponse({ ok: false, message: err.toString() });
  }
}

function getSheetName(dateStr) {
  let d;
  if (dateStr && dateStr.includes('-')) {
    d = new Date(dateStr);
  } else if (dateStr) {
    const parts = dateStr.split('/');
    d = new Date(parts[2] + '-' + parts[1] + '-' + parts[0]);
  } else {
    d = new Date();
  }
  return MONTHS[d.getMonth()] + '_' + d.getFullYear();
}

function getOrCreateSheet(ss, name, headers, headerColor) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);

    // Title row
    sheet.insertRowBefore(1);
    const titleCell = sheet.getRange(1, 1, 1, headers.length);
    titleCell.merge();
    titleCell.setValue('📊 ' + name + ' — StudioHub');
    titleCell.setBackground('#1e293b').setFontColor('#ffffff')
             .setFontSize(12).setFontWeight('bold')
             .setHorizontalAlignment('center');
    sheet.setRowHeight(1, 35);

    // Empty row for spacing
    sheet.insertRowBefore(2);
    sheet.setRowHeight(2, 10);

    // Header row
    const hdrRange = sheet.getRange(3, 1, 1, headers.length);
    hdrRange.setValues([headers]);
    hdrRange.setBackground(headerColor).setFontColor('#ffffff')
            .setFontWeight('bold').setFontSize(10);
    sheet.setRowHeight(3, 28);
    sheet.setFrozenRows(3);

    // Set column widths
    for (let i = 1; i <= headers.length; i++) {
      sheet.setColumnWidth(i, 130);
    }
  }
  return sheet;
}

function isDuplicate(sheet, value, colIndex) {
  const data = sheet.getDataRange().getValues();
  return data.some(row => row[colIndex] === value);
}

function updateSummary(sheet, numCols) {
  // Add/update summary at top after header
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return;

  // Summary info in row 2
  const summaryCell = sheet.getRange(2, 1, 1, numCols);
  summaryCell.merge();

  const dataRange = sheet.getRange(4, 1, lastRow - 3, numCols);
  const data = dataRange.getValues();
  const totalOmzet = data.reduce((s, row) => s + (Number(row[10]) || 0), 0);
  const totalBiayaOps = data.reduce((s, row) => s + (Number(row[11]) || 0), 0);
  const totalProfit = totalOmzet - totalBiayaOps;
  const lunas = data.filter(row => row[14] === 'LUNAS').length;
  const dp = data.filter(row => row[14] === 'DP').length;

  summaryCell.setValue(
    '📈 Total Omzet: Rp ' + totalOmzet.toLocaleString('id-ID') +
    '  |  💰 Profit: Rp ' + totalProfit.toLocaleString('id-ID') +
    '  |  ✅ Lunas: ' + lunas + '  |  ⏳ DP: ' + dp +
    '  |  📦 Total: ' + data.length + ' transaksi'
  );
  summaryCell.setBackground('#f0f9ff').setFontColor('#1e40af')
             .setFontWeight('bold').setHorizontalAlignment('center');
  sheet.setRowHeight(2, 28);
}

function updateExpenseSummary(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return;
  const data = sheet.getRange(4, 1, lastRow - 3, 5).getValues();
  const total = data.reduce((s, row) => s + (Number(row[3]) || 0), 0);
  const summaryCell = sheet.getRange(2, 1, 1, 5);
  summaryCell.merge();
  summaryCell.setValue('💸 Total Pengeluaran: Rp ' + total.toLocaleString('id-ID') + '  |  ' + data.length + ' item');
  summaryCell.setBackground('#fef2f2').setFontColor('#991b1b').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.setRowHeight(2, 28);
}

function doGet() {
  return jsonResponse({ ok: true, status: 'StudioHub webhook ready 🚀' });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`

export default function SheetsPage() {
  const isOffline = process.env.NEXT_PUBLIC_FEATURE_SHEETS !== 'true'
  const { toast } = useToast()
  const [settings, setSettings] = useState<any>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [syncStats, setSyncStats] = useState({ synced: 0, queued: 0, failed: 0 })
  const [syncLog, setSyncLog] = useState<any[]>([])
  const [testing, setTesting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [settingsRes, txRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/transactions?limit=100'),
    ])
    if (settingsRes.ok) {
      const s = await settingsRes.json()
      setSettings(s)
      setWebhookUrl(s?.webhookUrl || '')
      setSpreadsheetId(s?.spreadsheetId || '')
    }
    if (txRes.ok) {
      const data = await txRes.json()
      const txs = data.transactions || []
      setSyncStats({
        synced: txs.filter((t: any) => t.syncStatus === 'SYNCED').length,
        queued: txs.filter((t: any) => ['QUEUED', 'PENDING', 'FAILED'].includes(t.syncStatus)).length,
        failed: txs.filter((t: any) => t.syncStatus === 'FAILED').length,
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveSettings() {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, webhookUrl, spreadsheetId, studioName: settings?.studioName || 'StudioHub' }),
    })
    if (res.ok) { toast({ title: 'Webhook URL tersimpan!' }); load() }
  }

  async function testWebhook() {
    if (!webhookUrl) { toast({ title: 'Masukkan webhook URL terlebih dahulu', variant: 'destructive' }); return }
    setTesting(true)
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ping' }),
      })
      if (res.ok) {
        const data = await res.json()
        setSyncLog(prev => [{ status: 'ok', inv: 'PING TEST', msg: data.message || 'Webhook aktif!', time: new Date().toLocaleTimeString('id-ID') }, ...prev])
        toast({ title: 'Webhook aktif dan merespon!' })
      } else throw new Error(`HTTP ${res.status}`)
    } catch (err: any) {
      setSyncLog(prev => [{ status: 'fail', inv: 'PING TEST', msg: 'Gagal: ' + err.message, time: new Date().toLocaleTimeString('id-ID') }, ...prev])
      toast({ title: 'Test gagal: ' + err.message, variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  async function retryAll() {
    setRetrying(true)
    const res = await fetch('/api/sync/retry', { method: 'POST' })
    const data = await res.json()
    setSyncLog(prev => [{ status: 'ok', inv: 'BATCH RETRY', msg: `${data.synced} berhasil, ${data.failed} gagal`, time: new Date().toLocaleTimeString('id-ID') }, ...prev])
    if (data.synced > 0) toast({ title: `${data.synced} transaksi berhasil disync!` })
    await load()
    setRetrying(false)
  }

  if (loading) return <LoadingSpinner />

  if (isOffline) return (
    <div className="p-6 max-w-xl mx-auto mt-10">
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-center shadow-sm">
        <div className="text-4xl mb-3">??</div>
        <h2 className="text-base font-bold text-amber-800 mb-2">Fitur Tidak Tersedia di Versi Offline</h2>
        <p className="text-sm text-amber-700 leading-relaxed mb-4">
          Sinkronisasi Google Sheets hanya tersedia untuk <span className="font-semibold">StudioHub versi Online</span>.
          Fitur ini membutuhkan koneksi ke server cloud dan konfigurasi Google Sheets yang aktif.
        </p>
        <div className="bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm text-gray-600">
          Untuk mengaktifkan fitur ini, silakan hubungi developer untuk upgrade ke versi online.
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="Google Sheets Sync" subtitle="Konfigurasi webhook dan monitor sinkronisasi">
        <button onClick={retryAll} disabled={retrying} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} /> Retry Queue
        </button>
      </PageHeader>

      <div className="px-5 pb-5 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Tersync" value={syncStats.synced} valueColor="text-emerald-600" />
          <StatCard label="Dalam Queue" value={syncStats.queued} valueColor="text-amber-600" />
          <StatCard label="Gagal" value={syncStats.failed} valueColor="text-red-500" />
          <StatCard label="Sheet Aktif" value={getMonthSheetName(new Date())} valueColor="text-blue-600" />
        </div>

        {/* Webhook config */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">🔗 Konfigurasi Webhook</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Google Apps Script Webhook URL</label>
            <div className="flex gap-2">
              <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-blue-500" />
              <button onClick={saveSettings} className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700">
                <Save className="w-3.5 h-3.5" /> Simpan
              </button>
              <button onClick={testWebhook} disabled={testing} className="flex items-center gap-1.5 border border-gray-200 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                <Send className={`w-3.5 h-3.5 ${testing ? 'animate-pulse' : ''}`} /> {testing ? 'Testing...' : 'Test'}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Log */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold">Log Sinkronisasi</span>
            <button onClick={() => setSyncLog([])} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
          </div>
          {syncLog.length === 0
            ? <div className="text-center py-8 text-sm text-gray-400">Belum ada log sync</div>
            : <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
              {syncLog.map((l, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${l.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-bold text-blue-600 w-32 flex-shrink-0">{l.inv}</span>
                  <span className={`text-xs flex-shrink-0 ${l.status === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>{l.msg}</span>
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{l.time}</span>
                </div>
              ))}
            </div>
          }
        </div>

        {/* Setup Guide */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-5">🛠 Panduan Setup Google Apps Script</h3>
          <div className="space-y-5">
            {[
              { n: 1, title: 'Buat Google Spreadsheet baru', desc: 'Buka sheets.google.com → buat spreadsheet baru → catat ID dari URL (bagian panjang antara /d/ dan /edit).' },
              { n: 2, title: 'Buka Apps Script', desc: 'Di spreadsheet → Extensions → Apps Script → hapus kode default → paste kode di bawah ini:' },
              { n: 3, title: 'Ganti Spreadsheet ID', desc: 'Di baris pertama kode, ganti GANTI_DENGAN_SPREADSHEET_ID_KAMU dengan ID spreadsheet kamu.' },
              { n: 4, title: 'Deploy sebagai Web App', desc: 'Klik Deploy → New deployment → pilih Web App → Execute as: Me → Who has access: Anyone → Deploy → copy URL.' },
              { n: 5, title: 'Paste URL ke StudioHub', desc: 'Paste URL di field Webhook URL di atas → klik Simpan → klik Test. Kalau muncul "Webhook aktif!" berarti berhasil!' },
            ].map(s => (
              <div key={s.n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold mb-1">{s.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{s.desc}</div>
                  {s.n === 2 && (
                    <div className="mt-2 relative">
                      <button onClick={() => { navigator.clipboard.writeText(GAS_CODE); toast({ title: 'Kode GAS disalin!' }) }}
                        className="absolute top-2 right-2 flex items-center gap-1 bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-600 z-10">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <pre className="bg-gray-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed max-h-72 overflow-y-auto font-mono whitespace-pre-wrap">{GAS_CODE}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
