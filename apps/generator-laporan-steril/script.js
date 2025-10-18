// --- LOGIKA UTAMA GENERATOR LAPORAN STERIL ---

// --- KONFIGURASI ---
const DANGER_COLOR = "linear-gradient(to right, #e74c3c, #c0392b)"; 
const SUCCESS_COLOR = "linear-gradient(to right, #00b09b, #96c93d)";
const WARNING_COLOR = "linear-gradient(to right, #f39c12, #e67e22)";

// Daftar template proyek
let projectTemplatesFromDB = []; 

// Fungsi inisialisasi saat DOM siap
function muatAplikasi() {
    muatProjectsDariFirebase(); // Muat template dari JSON
    addShift(); 
    document.getElementById('tanggalLaporan').valueAsDate = new Date();
    document.getElementById('totalSebelumnya').value = '0.00'; 
}

// -------------------------------------------------------------------
// --- MANAJEMEN PROYEK & TEMPLATE ---
// -------------------------------------------------------------------

// Ambil template proyek dari file JSON lokal
function muatProjectsDariFirebase() { 
    fetch('templates.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Gagal memuat templates.json: ' + response.statusText);
            }
            return response.json();
        })
        .then(templates => {
            projectTemplatesFromDB = templates; 
            const selectInput = document.getElementById('projectInputSelect');
            selectInput.innerHTML = '<option value="" disabled selected>-- Pilih Template Proyek --</option>';

            if (!Array.isArray(projectTemplatesFromDB) || projectTemplatesFromDB.length === 0) {
                 selectInput.innerHTML = '<option value="" disabled>-- Tidak Ada Template --</option>';
                 return;
            }
            
            // Isi pilihan template
            projectTemplatesFromDB.forEach(namaProyek => {
                const option = document.createElement('option');
                option.value = namaProyek;
                option.textContent = namaProyek;
                selectInput.appendChild(option);
            });
            
            Toastify({ 
                text: `${projectTemplatesFromDB.length} template proyek berhasil dimuat.`, 
                duration: 2000, 
                style: { background: SUCCESS_COLOR },
                className: "toastify"
            }).showToast();

        })
        .catch(error => {
            console.error("ERROR MEMUAT TEMPLATE LOKAL:", error);
            const selectInput = document.getElementById('projectInputSelect');
            selectInput.innerHTML = '<option value="" disabled>ERROR MEMUAT TEMPLATE</option>';
            Toastify({ 
                text: `Gagal memuat template: ${error.message}`, 
                duration: 7000, 
                style: { background: DANGER_COLOR },
                className: "toastify"
            }).showToast();
        });
}

// Alihkan mode input proyek (Manual / Select)
function toggleProjectMode() {
    const isChecked = document.getElementById('toggleTemplateMode').checked;
    const manualInput = document.getElementById('projectInputManual');
    const selectInput = document.getElementById('projectInputSelect');
    
    // Kelola visibilitas input
    if (isChecked) {
        manualInput.classList.add('hidden');
        selectInput.classList.remove('hidden');
        manualInput.value = ''; 
        selectInput.focus();
    } else {
        manualInput.classList.remove('hidden');
        selectInput.classList.add('hidden');
        selectInput.selectedIndex = 0; 
        manualInput.focus();
    }
    gantiProyek(); // Reset total awal
}

// Reset Total Awal saat proyek berubah
function gantiProyek() { 
    document.getElementById('totalSebelumnya').value = '0.00'; 
}


// -------------------------------------------------------------------
// --- PARSING LAPORAN LAMA ---
// -------------------------------------------------------------------

// Mengurai teks laporan lama dan mengisi form
function uraiLaporanDariTeks() {
    const teks = document.getElementById('importLaporan').value;
    if (!teks.trim()) {
        Toastify({ text: "Text box masih kosong.", duration: 3000, style: { background: WARNING_COLOR }, className: "toastify" }).showToast();
        return;
    }
    try {
        const shiftContainer = document.getElementById('shift-container');
        shiftContainer.innerHTML = ''; 
        
        // 1. Parsing Proyek
        const matchProyek = teks.match(/\*Update (.*?)\*/);
        if (matchProyek) {
            document.getElementById('projectInputManual').value = matchProyek[1].trim();
            document.getElementById('toggleTemplateMode').checked = false;
            toggleProjectMode();
        }

        // 2. Parsing Tanggal
        const matchTanggal = teks.match(/\*.*?,\s*(\d{2})\/(\d{2})\/(\d{2})\*/);
        if (matchTanggal) {
            const [_, tgl, bln, thn] = matchTanggal;
            document.getElementById('tanggalLaporan').value = `20${thn}-${bln}-${tgl}`;
        }

        // 3. Parsing Total Awal
        const matchTotal = teks.match(/\*Total out\s*:\s*([\d.,]+)\s*\+/);
        if (matchTotal) {
            const totalAwal = matchTotal[1].replace(/\./g, '').replace(',', '.'); 
            document.getElementById('totalSebelumnya').value = parseFloat(totalAwal).toFixed(2);
        } else {
            document.getElementById('totalSebelumnya').value = '0.00';
        }

        // 4. Parsing Detail Shift
        const shiftRegex = /([A-Z0-9\s]+?)\s+(LS[12])\s+(\d+)x\s+In\s*:\s*([\d.,]+)\s*kg\s+Out\s*:\s*([\d.,]+)\s*kg/gi;
        const semuaShift = [...teks.matchAll(shiftRegex)];
        
        if (semuaShift.length > 0) {
            semuaShift.forEach(match => {
                const [_, operator, shift, proses, beratIn, beratOut] = match;
                const shiftBlock = addShiftSimple(false); 
                shiftBlock.querySelector('.operator').value = operator.trim();
                shiftBlock.querySelector('.shift-type').value = shift.toUpperCase();
                shiftBlock.querySelector('.jumlahProses').value = proses;
                shiftBlock.querySelector('.beratIn').value = beratIn.replace(',', '.'); 
                shiftBlock.querySelector('.totalBeratOut').value = beratOut.replace(',', '.');
            });
        }
        
        addShift(); 
        updateShiftNumbers();
        
        Toastify({ text: "Data berhasil dibaca dan diisi!", duration: 3000, style: { background: SUCCESS_COLOR }, className: "toastify" }).showToast();

    } catch (error) {
        console.error("Error saat mengurai teks:", error);
        Toastify({ text: "Gagal membaca teks. Format mungkin tidak sesuai.", duration: 3000, style: { background: DANGER_COLOR }, className: "toastify" }).showToast();
    }
}


// -------------------------------------------------------------------
// --- MANAJEMEN SHIFT ---
// -------------------------------------------------------------------

// Tambah blok shift Detail (dengan input per proses)
function addShift(updateNumbers = true) { 
    const shiftContainer = document.getElementById('shift-container'); 
    const shiftBlock = document.createElement('div'); 
    shiftBlock.className = 'shift-block shift-detail'; 
    
    shiftBlock.innerHTML = `
        <h3 class="shift-title"></h3>
        <button class="remove-shift-btn" onclick="this.closest('.shift-block').remove(); updateShiftNumbers();">
            <i class="fas fa-times-circle"></i> Hapus
        </button>
        <div class="form-grid">
            <div class="form-group">
                <label><i class="fas fa-user"></i> Inisial Operator</label>
                <input type="text" class="operator" placeholder="Contoh: MH">
            </div>
            <div class="form-group">
                <label><i class="fas fa-sync-alt"></i> Shift</label>
                <select class="shift-type">
                    <option value="LS1">Longshift 1 (LS1)</option>
                    <option value="LS2">Longshift 2 (LS2)</option>
                </select>
            </div>
            <div class="form-group">
                <label><i class="fas fa-tasks"></i> Jumlah Proses</label>
                <input type="number" class="jumlahProses" placeholder="Contoh: 4" oninput="createOutputInputs(this)">
            </div>
            <div class="form-group">
                <label><i class="fas fa-weight-hanging"></i> Berat Input / In (kg)</label>
                <input type="number" class="beratIn" step="0.01" placeholder="Contoh: 473.2">
            </div>
        </div>
        <div class="form-group detail-output-container">
            <label><i class="fas fa-boxes"></i> Detail Berat Output per Proses</label>
            <div class="output-details">
                <p>Isi "Jumlah Proses" terlebih dahulu.</p>
            </div>
        </div>
    `; 
    
    shiftContainer.appendChild(shiftBlock); 
    if(updateNumbers) updateShiftNumbers(); 
    return shiftBlock; 
}

// Tambah blok shift Simple (total output saja)
function addShiftSimple(updateNumbers = true) { 
    const shiftContainer = document.getElementById('shift-container'); 
    const shiftBlock = document.createElement('div'); 
    shiftBlock.className = 'shift-block shift-simple'; 
    
    shiftBlock.innerHTML = `
        <h3 class="shift-title"></h3>
        <button class="remove-shift-btn" onclick="this.closest('.shift-block').remove(); updateShiftNumbers();">
            <i class="fas fa-times-circle"></i> Hapus
        </button>
        <div class="form-grid">
            <div class="form-group">
                <label><i class="fas fa-user"></i> Inisial Operator</label>
                <input type="text" class="operator" placeholder="Contoh: UM">
            </div> 
            <div class="form-group">
                <label><i class="fas fa-sync-alt"></i> Shift</label>
                <select class="shift-type">
                    <option value="LS1">Longshift 1 (LS1)</option>
                    <option value="LS2">Longshift 2 (LS2)</option>
                </select>
            </div>
            <div class="form-group">
                <label><i class="fas fa-tasks"></i> Jumlah Proses</label>
                <input type="number" class="jumlahProses" placeholder="Contoh: 3">
            </div>
            <div class="form-group">
                <label><i class="fas fa-weight-hanging"></i> Total Berat Input (kg)</label>
                <input type="number" class="beratIn" step="0.01" placeholder="Contoh: 287.70">
            </div>
            <div class="form-group">
                <label><i class="fas fa-weight-hanging"></i> Total Berat Output (kg)</label>
                <input type="number" class="totalBeratOut" step="0.01" placeholder="Contoh: 289.26">
            </div>
        </div>
    `; 
    
    shiftContainer.appendChild(shiftBlock); 
    if(updateNumbers) updateShiftNumbers(); 
    return shiftBlock; 
}

// Perbarui penomoran judul shift
function updateShiftNumbers() { 
    const allShiftBlocks = document.querySelectorAll('.shift-block'); 
    allShiftBlocks.forEach((block, index) => { 
        const shiftTitle = block.querySelector('.shift-title'); 
        if (shiftTitle) { 
            shiftTitle.textContent = `Data Shift ${index + 1}`; 
        } 
    }); 
}

// Buat input berat output berdasarkan Jumlah Proses (untuk Shift Detail)
function createOutputInputs(jumlahProsesInput) { 
    const jumlah = parseInt(jumlahProsesInput.value) || 0; 
    const shiftBlock = jumlahProsesInput.closest('.shift-block'); 
    const outputDetailsContainer = shiftBlock.querySelector('.output-details'); 
    outputDetailsContainer.innerHTML = ''; 
    
    if (jumlah > 0 && jumlah < 50) { 
        for (let i = 1; i <= jumlah; i++) { 
            const entryDiv = document.createElement('div'); 
            entryDiv.className = 'output-entry'; 
            entryDiv.innerHTML = `<label>Proses ${i}:</label><input type="number" step="0.01" class="output-weight" placeholder="kg">`; 
            outputDetailsContainer.appendChild(entryDiv); 
        } 
    } else if (jumlah === 0) { 
        outputDetailsContainer.innerHTML = '<p>Isi "Jumlah Proses" terlebih dahulu.</p>'; 
    }
}


// -------------------------------------------------------------------
// --- GENERATE DAN COPY ---
// -------------------------------------------------------------------

// Buat laporan akhir dari semua input form
async function generateReport() {
    
    // Tentukan Nama Proyek dari input yang aktif
    const manualInput = document.getElementById('projectInputManual');
    const selectInput = document.getElementById('projectInputSelect');
    
    let namaProyek;
    if (manualInput.classList.contains('hidden')) {
        namaProyek = selectInput.value.trim();
    } else {
        namaProyek = manualInput.value.trim();
    }
    
    const totalAwal = parseFloat(document.getElementById('totalSebelumnya').value) || 0; 
    const inputTanggal = document.getElementById('tanggalLaporan').value; 
    
    if (!inputTanggal || !namaProyek) { 
        Toastify({ text: "Proyek dan Tanggal harus diisi.", duration: 3000, style: { background: DANGER_COLOR }, className: "toastify" }).showToast(); 
        return; 
    } 
    
    // Format Tanggal
    let tanggalFormatted; 
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']; 
    const tgl = new Date(inputTanggal + 'T00:00:00'); 
    const dayName = days[tgl.getDay()]; 
    const date = String(tgl.getDate()).padStart(2, '0'); 
    const month = String(tgl.getMonth() + 1).padStart(2, '0'); 
    const year = String(tgl.getFullYear()).slice(-2); 
    tanggalFormatted = `${dayName}, ${date}/${month}/${year}`; 
    
    const shiftBlocks = document.querySelectorAll('.shift-block'); 
    let totalOutputHariIni = 0; 
    let detailSemuaShift = ''; 
    let isAdaShift = false; 
    
    // Iterasi setiap shift untuk mengambil data dan menghitung total
    shiftBlocks.forEach(shiftBlock => { 
        const operatorInput = shiftBlock.querySelector('.operator'); 
        
        if (operatorInput && operatorInput.value.trim() !== '') { 
            isAdaShift = true; 
            const operator = operatorInput.value; 
            const shiftType = shiftBlock.querySelector('.shift-type').value; 
            const beratIn = parseFloat(shiftBlock.querySelector('.beratIn').value) || 0; 
            
            let beratOutShift = 0; 
            let jumlahProsesText = ''; 
            const jumlahProses = shiftBlock.querySelector('.jumlahProses')?.value || ''; 
            jumlahProsesText = jumlahProses ? `${jumlahProses}x` : ''; 
            
            // Hitung berat output berdasarkan tipe shift
            if (shiftBlock.classList.contains('shift-detail')) { 
                const outputInputs = shiftBlock.querySelectorAll('.output-weight'); 
                outputInputs.forEach(input => { 
                    beratOutShift += parseFloat(input.value) || 0; 
                }); 
            } else { 
                beratOutShift = parseFloat(shiftBlock.querySelector('.totalBeratOut').value) || 0; 
            } 
            
            totalOutputHariIni += beratOutShift; 
            
            // Susun detail per shift
            detailSemuaShift += `${operator} ${shiftType} ${jumlahProsesText}\n`.replace('  ', ' '); 
            detailSemuaShift += `In : ${beratIn.toLocaleString('id-ID')}kg\n`; 
            detailSemuaShift += `Out : ${beratOutShift.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})}kg\n\n`; 
        } 
    }); 
    
    if (!isAdaShift) { 
        Toastify({ text: "Isi data minimal satu shift.", duration: 3000, style: { background: WARNING_COLOR }, className: "toastify" }).showToast(); 
        return; 
    } 
    
    const totalAkhir = totalAwal + totalOutputHariIni; 
    
    // Susun baris total
    let totalLine = ''; 
    if (totalAwal > 0) { 
        totalLine = `\n*Total out : ${totalAwal.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})} + ${totalOutputHariIni.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})} = ${totalAkhir.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg*`; 
    } else { 
        totalLine = `\n*Total out : ${totalAkhir.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg*`; 
    } 
    
    const finalReportText = `*Update ${namaProyek}*\n\n*${tanggalFormatted}*\n\n${detailSemuaShift.trim()}${totalLine}`; 
    document.getElementById('hasilLaporan').value = finalReportText; 
    
    // Simpan ke Riwayat (Local Storage)
    const newReport = { 
        id: Date.now(), 
        tanggalDibuat: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }), 
        namaProyek: namaProyek, 
        totalOutputHariIni: totalOutputHariIni, 
        teksLaporan: finalReportText 
    }; 
    let history = JSON.parse(localStorage.getItem('riwayatLaporan')) || []; 
    history.unshift(newReport); 
    localStorage.setItem('riwayatLaporan', JSON.stringify(history)); 
    
    Toastify({ text: "Laporan dibuat & disimpan!", duration: 3000, gravity: "top", position: "center", style: { background: SUCCESS_COLOR }, className: "toastify" }).showToast(); 
}

// Salin teks laporan ke clipboard
function copyReport() { 
    const textArea = document.getElementById('hasilLaporan'); 
    
    if (textArea.value) { 
        navigator.clipboard.writeText(textArea.value).then(() => { 
            Toastify({ text: "Laporan berhasil disalin!", duration: 3000, gravity: "top", position: "center", style: { background: SUCCESS_COLOR }, className: "toastify" }).showToast(); 
        }).catch(err => { 
            Toastify({ text: "Gagal menyalin. Salin manual.", duration: 3000, gravity: "top", position: "center", style: { background: DANGER_COLOR }, className: "toastify" }).showToast(); 
        }); 
    } else { 
        Toastify({ text: "Tidak ada laporan untuk disalin.", duration: 3000, gravity: "top", position: "center", style: { background: WARNING_COLOR }, className: "toastify" }).showToast(); 
    } 
}


// -------------------------------------------------------------------
// --- MODAL & RIWAYAT ---
// -------------------------------------------------------------------

// Tutup modal berdasarkan ID
function tutupModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// Tampilkan modal riwayat dan muat daftar laporan
function tampilkanRiwayat() { 
    const modal = document.getElementById('historyModal'); 
    const historyList = document.getElementById('historyList'); 
    const detailText = document.getElementById('historyDetailText'); 
    
    historyList.innerHTML = ''; 
    detailText.value = ''; 
    
    const history = JSON.parse(localStorage.getItem('riwayatLaporan')) || []; 
    
    if (history.length === 0) { 
        historyList.innerHTML = '<p class="history-empty-state">Belum ada riwayat laporan.</p>'; 
        modal.classList.remove('hidden'); 
        return; 
    } 
    
    // Isi daftar riwayat
    history.forEach(report => { 
        const item = document.createElement('div'); 
        item.className = 'history-item'; 
        item.dataset.id = report.id; 
        item.onclick = () => tampilkanDetailLaporan(report.id); 
        
        const outputFormatted = report.totalOutputHariIni.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        item.innerHTML = `
            <p class="date"><i class="fas fa-calendar-alt"></i> ${report.tanggalDibuat}</p>
            <p class="project"><i class="fas fa-box-open"></i> ${report.namaProyek}</p>
            <p class="output-value">Output: ${outputFormatted} kg</p>
        `; 
        historyList.appendChild(item); 
    }); 
    
    modal.classList.remove('hidden'); 
}

// Tampilkan detail teks laporan yang dipilih dari riwayat
function tampilkanDetailLaporan(id) { 
    const history = JSON.parse(localStorage.getItem('riwayatLaporan')) || []; 
    const report = history.find(r => r.id === id); 
    
    if (report) { 
        document.getElementById('historyDetailText').value = report.teksLaporan; 
        
        document.querySelectorAll('.history-item').forEach(item => { 
            item.classList.remove('active'); 
            if (parseInt(item.dataset.id) === id) { 
                item.classList.add('active'); 
            } 
        }); 
    } 
}

// Hapus semua data riwayat dari Local Storage
function hapusRiwayat() { 
    if (confirm('Yakin ingin menghapus SELURUH riwayat? Tidak bisa dibatalkan.')) { 
        localStorage.removeItem('riwayatLaporan'); 
        Toastify({ text: "Seluruh riwayat telah dihapus.", duration: 3000, style: { background: WARNING_COLOR }, className: "toastify" }).showToast(); 
        tampilkanRiwayat(); 
    } 
}
