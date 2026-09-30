import { useEffect, useRef, useState } from 'react'; 
import { 
  ActivityIndicator, BackHandler, FlatList, 
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, 
  StatusBar, StyleSheet, Text, TextInput, View, 
} from 'react-native'; 
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'; 
import { api } from './src/api'; 
import { rupiah, tanggalLokal, validate } from './src/helpers'; 

export default function App() { 
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Utama />
    </SafeAreaProvider>
  ); 
} 

function Utama() { 
  const [screen, setScreen] = useState('list'); 
  const [items, setItems] = useState([]); 
  const [categories, setCategories] = useState([]); 
  const [selected, setSelected] = useState(null); 
  const [loading, setLoading] = useState(false); 
  const [busy, setBusy] = useState(false); 
  const [error, setError] = useState(''); 
  const [judul, setJudul] = useState(''); 
  const [nominal, setNominal] = useState(''); 
  const [categoryId, setCategoryId] = useState(null); 
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [modalCategoryVisible, setModalCategoryVisible] = useState(false);
  const lock = useRef(false); 

  const totalHariIni = items.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);

  async function load() { 
    if (lock.current) return; 
    lock.current = true; setLoading(true); setError(''); 
    try { 
      const rows = await api.list(); 
      if (!Array.isArray(rows)) throw new Error('Daftar harus berupa array');  
      setItems(rows); 
    } catch (e) { setError(e.message); } 
    finally { lock.current = false; setLoading(false); } 
  } 

  useEffect(() => { load(); }, []);

  function back() { 
    if (lock.current) return; 
    setError(''); 
    setScreen(screen === 'edit' ? 'detail' : 'list'); 
  } 

  useEffect(() => { 
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {  
      if (screen === 'list' && !lock.current) return false; 
      back(); return true; 
    }); 
    return () => sub.remove(); 
  }, [screen]); 

  async function openDetail(id) { 
    if (lock.current) return; 
    lock.current = true; setBusy(true); setError(''); 
    try { 
      setSelected(await api.detail(id)); setScreen('detail'); 
    } catch (e) { setError(e.message); } 
    finally { lock.current = false; setBusy(false); } 
  } 

  async function openCreate() { 
    if (lock.current) return; 
    lock.current = true; setBusy(true); setError(''); 
    try { 
      const rows = await api.categories(); 
      if (!Array.isArray(rows)) throw new Error('Kategori harus berupa array');  
      setCategories(rows); setJudul(''); setNominal(''); 
      setCategoryId(null); setScreen('create'); 
    } catch (e) { setError(e.message); } 
    finally { lock.current = false; setBusy(false); } 
  } 

  function openEdit() { 
    setJudul(selected.judul); setNominal(String(selected.nominal)); 
    setError(''); setScreen('edit'); 
  }

  async function save() { 
    if (lock.current) return; 
    const pesan = validate(judul, nominal); 
    if (pesan) { setError(pesan); return; } 
    lock.current = true; setBusy(true); setError(''); 
    let saved = false; 
    try { 
      const body = { judul: judul.trim(), nominal: Number(nominal) };  
      if (screen === 'create') { 
        await api.create({ ...body, id_kategori: categoryId }); 
      } else { 
        await api.update(selected.id, body); 
      } 
      saved = true; 
      setItems([]); setScreen('list'); setSelected(null); 
      const rows = await api.list(); 
      if (!Array.isArray(rows)) throw new Error('Daftar harus berupa array');  
      setItems(rows); 
    } catch (e) { 
      setError(saved ? `Data tersimpan. Muat ulang daftar: ${e.message}` : `${e.message}.`);  
    } finally { lock.current = false; setBusy(false); } 
  } 

  async function remove() { 
    if (lock.current) return; 
    lock.current = true; setBusy(true); setError(''); 
    setModalDeleteVisible(false);
    let deleted = false; 
    try { 
      await api.remove(selected.id); deleted = true; 
      setItems([]); setSelected(null); setScreen('list'); 
      const rows = await api.list(); 
      if (!Array.isArray(rows)) throw new Error('Daftar harus berupa array');  
      setItems(rows); 
    } catch (e) { 
      setError(deleted ? `Data terhapus. Muat ulang daftar: ${e.message}` : e.message); 
    } finally { lock.current = false; setBusy(false); } 
  }

  const disabled = loading || busy; 
  const selectedCategoryName = categories.find(c => c.id === categoryId)?.nama || 'Pilih Kategori';

  return ( 
    <SafeAreaView style={s.page}> 
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}> 
        
        {/* HEADER NAVIGASI */}
        <View style={s.headerNav}>
          {screen !== 'list' ? (
            <View style={s.navRow}>
              <Pressable onPress={back} disabled={disabled} style={s.backBtn}>
                <Text style={s.backIcon}>←</Text>
              </Pressable>
              <Text style={s.navTitle}>
                {screen === 'create' ? 'Tambah Pengeluaran' : screen === 'edit' ? 'Ubah Pengeluaran' : 'Detail Transaksi'}
              </Text>
              {screen === 'detail' && selected ? (
                <View style={s.actionRow}>
                  <Pressable onPress={openEdit} disabled={disabled} style={s.iconAction}>
                    <Text style={s.iconText}>✏️</Text>
                  </Pressable>
                  <Pressable onPress={() => setModalDeleteVisible(true)} disabled={disabled} style={s.iconAction}>
                    <Text style={[s.iconText, { color: '#DC2626' }]}>🗑️</Text>
                  </Pressable>
                </View>
              ) : <View style={{ width: 40 }} />}
            </View>
          ) : (
            <View style={s.mainHeader}>
              <View>
                <Text style={s.mainTitle}>Pencatatan Pengeluaran</Text>
                <Text style={s.subTitle}>Total Hari Ini: {rupiah(totalHariIni)}</Text>
              </View>
              <Pressable onPress={load} disabled={disabled} style={s.reloadBtn}>
                <Text style={s.reloadText}>🔄 Muat Ulang</Text>
              </Pressable>
            </View>
          )}
        </View>

        {disabled && <ActivityIndicator size="large" color="#0D7C66" style={{ marginVertical: 12 }} />}

        {/* 14_GAGAL_MEMUAT (TAMPILAN JIKA ERROR DI LIST) */}
        {screen === 'list' && !!error && !disabled && (
          <View style={s.centerBox}>
            <View style={s.iconCircle}>
              <Text style={{ fontSize: 36 }}>☁️</Text>
            </View>
            <Text style={s.errorTitle}>Gagal Memuat Data</Text>
            <Text style={s.errorDesc}>Periksa koneksi internet Anda dan coba lagi</Text>
            <Pressable style={s.outlineBtn} onPress={load}>
              <Text style={s.outlineBtnText}>Coba Lagi</Text>
            </Pressable>
          </View>
        )}

        {/* SCREEN LIST */}
        {screen === 'list' && !error && (
          <View style={s.flex}>
            <FlatList 
              data={items} 
              keyExtractor={(item) => String(item.id)}  
              refreshing={loading} 
              onRefresh={load} 
              contentContainerStyle={items.length === 0 ? s.centerBox : { paddingBottom: 100 }}
              
              /* 13_DAFTAR_KOSONG */
              ListEmptyComponent={!disabled ? (
                <View style={{ alignItems: 'center' }}>
                  <View style={s.iconCircle}>
                    <Text style={{ fontSize: 36 }}>👛</Text>
                  </View>
                  <Text style={s.emptyTitle}>Belum ada pengeluaran</Text>
                  <Text style={s.emptyDesc}>Ketuk tombol + untuk menambah pengeluaran pertama Anda</Text>
                </View>
              ) : null} 

              renderItem={({ item }) => ( 
                <Pressable style={s.card} accessibilityRole="button" disabled={disabled} onPress={() => openDetail(item.id)}>  
                  <View style={s.cardHeader}>
                    <Text style={s.cardTitle}>{item.judul}</Text> 
                    <Text style={s.cardNominal}>{rupiah(item.nominal)}</Text> 
                  </View>
                  <View style={s.cardFooter}>
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{item.kategori || 'Tanpa Kategori'}</Text>
                    </View>
                    <Text style={s.cardDate}>{tanggalLokal(item.tanggal)}</Text> 
                  </View>
                </Pressable> 
              )} 
            /> 

            {/* FLOATING ACTION BUTTON (+) */}
            <Pressable style={s.fab} onPress={openCreate} disabled={disabled}>
              <Text style={s.fabText}>+</Text>
            </Pressable>
          </View>
        )} 

        {/* 15_DATA_TIDAK_ADA (JIKA DETAIL TIDAK DITEMUKAN) */}
        {screen === 'detail' && !selected && !disabled && (
          <View style={s.centerBox}>
            <View style={s.iconCircle}>
              <Text style={{ fontSize: 36 }}>📄</Text>
            </View>
            <Text style={s.errorTitle}>Data Tidak Ditemukan</Text>
            <Text style={s.errorDesc}>Transaksi yang Anda cari tidak ada atau telah dihapus</Text>
            <Pressable style={s.primaryBtnWidth} onPress={back}>
              <Text style={s.primaryBtnText}>Kembali ke Daftar</Text>
            </Pressable>
          </View>
        )}

        {/* 08_DETAIL TRANSAKSI */}
        {screen === 'detail' && selected && (
          <ScrollView contentContainerStyle={{ padding: 16 }}> 
            <View style={s.detailHeaderBox}>
              <Text style={s.detailNominalBig}>{rupiah(selected.nominal)}</Text>
            </View>

            <View style={s.detailCard}> 
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>ID Transaksi</Text>
                <Text style={s.detailValBold}>TRX-{String(selected.id).padStart(3, '0')}</Text>
              </View>
              <View style={s.divider} />

              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Judul</Text>
                <Text style={s.detailValBold}>{selected.judul}</Text>
              </View>
              <View style={s.divider} />

              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Tanggal</Text>
                <Text style={s.detailValBold}>{tanggalLokal(selected.tanggal)}</Text>
              </View>
              <View style={s.divider} />

              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Kategori</Text>
                <Text style={s.detailValBold}>{selected.kategori || selected.nama_kategori || 'Tanpa Kategori'}</Text>
              </View>
              <View style={s.divider} />

              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Catatan</Text>
                <Text style={[s.detailVal, { color: '#94A3B8' }]}>{selected.catatan || 'Belum ada catatan'}</Text>
              </View>
            </View> 
          </ScrollView>
        )}

        {/* 09_UBAH & TAMBAH PENGELUARAN */}
        {(screen === 'create' || screen === 'edit') && (
          <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1 }} keyboardShouldPersistTaps="handled"> 
            {!!error && <Text style={s.errorFormText}>{error}</Text>}

            <Text style={s.fieldLabel}>Judul</Text> 
            <TextInput 
              style={s.textInput} 
              value={judul} 
              onChangeText={setJudul} 
              editable={!busy} 
              maxLength={100} 
              placeholder="Makan Siang di Kantin" 
              placeholderTextColor="#94A3B8"
            /> 

            <Text style={s.fieldLabel}>Nominal</Text> 
            <TextInput 
              style={s.textInput} 
              value={nominal} 
              onChangeText={setNominal} 
              keyboardType="number-pad" 
              editable={!busy} 
              placeholder="50000" 
              placeholderTextColor="#94A3B8"
            /> 

            {screen === 'create' ? (
              <> 
                <Text style={s.fieldLabel}>Kategori</Text> 
                <Pressable 
                  style={s.selectInput} 
                  onPress={() => setModalCategoryVisible(true)}
                  disabled={busy}
                >
                  <Text style={{ color: categoryId ? '#0F172A' : '#94A3B8', fontSize: 14 }}>
                    {selectedCategoryName}
                  </Text>
                  <Text style={{ color: '#64748B' }}>∨</Text>
                </Pressable>
              </> 
            ) : (
              /* FIGMA 09_UBAH: READ-ONLY FIELDS WITH LOCK ICON */
              <>
                <Text style={s.fieldLabel}>Kategori</Text>
                <View style={s.disabledInputRow}>
                  <Text style={s.disabledInputText}>{selected?.kategori || selected?.nama_kategori || 'Makanan'}</Text>
                  <Text style={{ fontSize: 14 }}>🔒</Text>
                </View>

                <Text style={s.fieldLabel}>Tanggal</Text>
                <View style={s.disabledInputRow}>
                  <Text style={s.disabledInputText}>{tanggalLokal(selected?.tanggal)}</Text>
                  <Text style={{ fontSize: 14 }}>🔒</Text>
                </View>

                <Text style={s.infoLockText}>Kategori & tanggal tidak dapat diubah</Text>
              </>
            )}  

            <View style={{ marginTop: 'auto', paddingTop: 24, paddingBottom: 12 }}>
              <Pressable style={s.primaryBtn} onPress={save} disabled={disabled}>
                <Text style={s.primaryBtnText}>
                  {busy ? 'Menyimpan...' : screen === 'create' ? 'Simpan Pengeluaran' : 'Simpan Perubahan'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        )} 

        {/* 11_KONFIRMASI_HALAMAN (MODAL DIALOG HAPUS TRANSAKSI) */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalDeleteVisible}
          onRequestClose={() => setModalDeleteVisible(false)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Hapus Transaksi?</Text>
              <Text style={s.modalDesc}>
                Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.
              </Text>
              <View style={s.modalBtnRow}>
                <Pressable style={s.cancelBtn} onPress={() => setModalDeleteVisible(false)}>
                  <Text style={s.cancelBtnText}>Batal</Text>
                </Pressable>
                <Pressable style={s.deleteBtn} onPress={remove}>
                  <Text style={s.deleteBtnText}>Hapus</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL BOTTOM SHEET KATEGORI */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalCategoryVisible}
          onRequestClose={() => setModalCategoryVisible(false)}
        >
          <Pressable style={s.modalOverlay} onPress={() => setModalCategoryVisible(false)}>
            <View style={s.bottomSheet}>
              <View style={s.sheetHeader}>
                <View style={s.sheetHandle} />
                <Text style={s.sheetTitle}>Pilih Kategori</Text>
              </View>
              <ScrollView>
                {[{ id: null, nama: 'Tanpa Kategori' }, ...categories].map((k) => (
                  <Pressable 
                    key={String(k.id)} 
                    style={s.sheetOption} 
                    onPress={() => { setCategoryId(k.id); setModalCategoryVisible(false); }}
                  >
                    <Text style={[s.sheetOptionText, categoryId === k.id && { color: '#0D7C66', fontWeight: '700' }]}>
                      {k.nama}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

      </KeyboardAvoidingView> 
    </SafeAreaView> 
  ); 
}

const s = StyleSheet.create({ 
  flex: { flex: 1 }, 
  page: { flex: 1, backgroundColor: '#FFFFFF' }, 
  
  // Header
  headerNav: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  mainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subTitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  reloadBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  reloadText: { fontSize: 12, color: '#0D7C66', fontWeight: '600' },
  
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  backIcon: { fontSize: 20, color: '#0F172A', fontWeight: '600' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  actionRow: { flexDirection: 'row', gap: 12 },
  iconAction: { padding: 2 },
  iconText: { fontSize: 16 },

  // Cards & Lists (Tetap sesuai keinginanmu)
  card: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', marginHorizontal: 16, marginTop: 12, gap: 12, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  cardNominal: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  cardDate: { fontSize: 12, color: '#94A3B8' },

  // Floating Action Button
  fab: { position: 'absolute', right: 20, bottom: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#0D7C66', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  fabText: { fontSize: 26, color: '#FFFFFF', marginTop: -2 },

  // 08_Detail Screen
  detailHeaderBox: { alignItems: 'center', marginVertical: 28 },
  detailNominalBig: { fontSize: 32, fontWeight: '800', color: '#0D7C66' },
  detailCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8 },
  detailItem: { paddingVertical: 10 },
  detailLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  detailVal: { fontSize: 14, color: '#0F172A' },
  detailValBold: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F8FAFC' },

  // Form Inputs & 09_Ubah
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#0F172A', marginTop: 14, marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: '#0D7C66', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#FFFFFF', color: '#0F172A' },
  selectInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF' },
  disabledInputRow: { borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' },
  disabledInputText: { fontSize: 14, color: '#94A3B8' },
  infoLockText: { fontSize: 11, color: '#CBD5E1', marginTop: 8 },
  errorFormText: { color: '#DC2626', fontSize: 12, marginBottom: 8 },
  
  // Buttons
  primaryBtn: { backgroundColor: '#0D7C66', borderRadius: 8, paddingVertical: 14, alignItems: 'center', width: '100%' },
  primaryBtnWidth: { backgroundColor: '#0D7C66', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  outlineBtn: { borderWidth: 1, borderColor: '#0D7C66', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28, marginTop: 16 },
  outlineBtnText: { color: '#0D7C66', fontSize: 14, fontWeight: '600' },

  // Empty / Error States (13, 14, 15)
  centerBox: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18, maxWidth: 240 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  errorDesc: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18, marginBottom: 16 },

  // 11_Konfirmasi_Halaman (Modal Dialog)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '82%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  modalDesc: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { color: '#0F172A', fontWeight: '600', fontSize: 13 },
  deleteBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#B91C1C', alignItems: 'center' },
  deleteBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },

  // Bottom Sheet Category
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '50%' },
  sheetHeader: { alignItems: 'center', marginBottom: 16 },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, marginBottom: 12 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  sheetOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  sheetOptionText: { fontSize: 14, color: '#0F172A' },
});