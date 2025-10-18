// Pengaturan Utama Dashboard JS

document.addEventListener('DOMContentLoaded', () => {
    // 1. Status Bar Real-time (Waktu & Tanggal)
    const timeEl = document.getElementById('system-time');
    const dateEl = document.getElementById('system-date');
    const healthEl = document.getElementById('system-health');

    // Tugas pembaruan waktu
    const updateTime = () => {
        const now = new Date();
        // Format Waktu
        const timeStr = now.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        // Format Tanggal
        const dateStr = now.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        }).replace(/\./g, ''); 

        if (timeEl) timeEl.textContent = timeStr;
        if (dateEl) dateEl.textContent = dateStr;
        
        // Status kesehatan (Hardcoded OK)
        if (healthEl) {
             healthEl.innerHTML = '<i class="fas fa-check-circle"></i> SYSTEM ONLINE';
        }
    };

    // Jalankan dan ulangi pembaruan per detik
    setInterval(updateTime, 1000);
    updateTime();

    // 2. Activity Feed (Log Data Simulasi)
    const activityLog = document.getElementById('activity-log');
    
    // Data log awal
    const initialLogs = [
        "Dashboard loaded successfully",
        "CSS Grid Overlay applied",
        "System health check: OK",
    ];

    // Fungsi tambah log (pesan & gaya)
    const addLog = (message, className) => {
        const li = document.createElement('li');
        li.className = `log-item ${className || ''}`;
        // Ambil cap waktu (HH:MM:SS)
        const currentTime = new Date().toLocaleTimeString('id-ID').substring(0, 8); 
        li.textContent = `${currentTime} - ${message}`;
        // Masukkan di depan (prepend)
        activityLog.prepend(li);
    };

    // Muat log awal dengan penundaan
    setTimeout(() => {
        // Hapus penanda placeholder
        const initialPlaceholder = document.querySelector('.log-item.initial');
        if (initialPlaceholder) initialPlaceholder.remove();
        
        initialLogs.forEach((log, index) => {
            // Delay berurutan untuk efek ketikan
            setTimeout(() => {
                addLog(log, 'system-load');
            }, index * 300); 
        });
    }, 1000);
});
