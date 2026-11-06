/* 
  School of Character (SoC) - Pojok Hope
  AI CHARACTER ASSISTANT WIDGET LOGIC
*/

const AI_RESPONSES = {
  about: {
    question: "Apa itu SoC Pojok Hope?",
    answer: "<strong>School of Character (SoC) - Pojok Hope</strong> adalah lembaga bimbingan belajar non-formal berbasis komunitas di Kabila, Gorontalo.<br><br>Fokus utama kami adalah menanamkan karakter mulia (kejujuran, empati, disiplin, kerja sama) serta memperkuat kecakapan berpikir kritis lewat Calistung, Matematika Menyenangkan, Bahasa Inggris Aktif, dan eksplorasi Outdoor Learning di alam bebas."
  },
  calistung: {
    question: "Apa fungsi kelas Calistung?",
    answer: "Kelas <strong>Calistung (Baca, Tulis, Hitung)</strong> adalah kelas fondasi dasar pra-reguler. Tujuannya membimbing anak yang baru mulai mengenal alfabet, fonik suku kata, kelancaran menulis tangan, dan konsep bilangan dasar secara sabar dan menyenangkan tanpa tekanan.<br><br>Setelah menguasai kecakapan dasar ini, siswa akan dipromosikan ke kelompok kelas reguler berjenjang: English Level A/B/C dan Matematika Level A/B/C."
  },
  jadwal: {
    question: "Bagaimana jadwal & level kelas?",
    answer: "Sesi belajar dilaksanakan pada sore hari (Senin &ndash; Sabtu, 14:00 &ndash; 17:30 WITA) dengan pembagian terstruktur:<br>&bull; <strong>Calistung:</strong> Berjalan rutin setiap minggu untuk siswa pemula.<br>&bull; <strong>English &amp; Matematika:</strong> Berjalan bergantian berjenjang (Level A Beginner, Level B Intermediate, Level C Advanced).<br>&bull; <strong>Pendidikan Karakter:</strong> Sesi refleksi tematik gabungan bulanan untuk seluruh siswa.<br>&bull; <strong>Outdoor Learning:</strong> Aktivitas edukatif di alam terbuka yang diadakan setiap akhir semester."
  },
  daftar: {
    question: "Bagaimana cara daftar siswa baru?",
    answer: "Pendaftaran siswa baru dapat dilakukan dengan sangat mudah:<br>1. Buka menu <strong>Pendaftaran</strong> pada navigasi website ini atau isi formulir Google Form pendaftaran siswa.<br>2. Tim pengajar kami akan menghubungi orang tua untuk sesi asesmen awal yang ramah anak guna menentukan kelompok belajar yang paling tepat (Calistung atau Level A/B/C).<br>3. Pendaftaran bersifat inklusif untuk seluruh anak di Kabila dan sekitarnya!"
  },
  rapor: {
    question: "Bagaimana cara pantau rapor & absensi?",
    answer: "Orang tua dan siswa dapat memantau perkembangan belajar secara transparan melalui <strong>Portal Dashboard SoC</strong>.<br><br>Di dashboard, Anda dapat melihat rekap kehadiran harian, grafik capaian semester (Ganjil &amp; Genap), akumulasi bintang 4 karakter utama, serta mengunduh dokumen resmi <strong>Rapor Nilai Siswa (PDF)</strong> siap cetak ukuran A4 yang ditandatangani oleh Direktur &amp; Manajer Operasional."
  },
  donasi: {
    question: "Bagaimana cara donasi / jadi sponsor?",
    answer: "Kami membuka pintu kolaborasi seluas-luasnya bagi donatur perorangan, komunitas, kampus, dan mitra perusahaan.<br><br>Dukungan dapat disalurkan melalui <strong>Donasi Buku &amp; Alat Belajar</strong>, <strong>Sponsor Snack Sehat &amp; Operasional Kelas</strong>, maupun <strong>Relawan Pengajar Tamu</strong>. Anda dapat langsung mengklik tombol Hubungi via WhatsApp atau Kirim Email Kemitraan pada bagian Kemitraan &amp; Kepedulian di atas!"
  }
};

class AiWidget {
  constructor() {
    this.widgetBody = document.getElementById('ai-widget-body');
    this.choicesContainer = document.getElementById('ai-choices-container');
    this.isTyping = false;
  }

  init() {
    if (!this.widgetBody || !this.choicesContainer) return;
    
    // Clear dynamic children
    this.widgetBody.innerHTML = '';
    
    // Add default welcome message
    this.addMessage("Halo! Saya Asisten Karakter SoC. Ada yang bisa saya bantu jelaskan mengenai kurikulum, kelas Calistung, jadwal, atau transparansi rapor anak hari ini?", 'ai');
    
    // Bind click events to choice chips
    this.setupChips();
  }

  setupChips() {
    this.choicesContainer.innerHTML = '';
    
    Object.keys(AI_RESPONSES).forEach(key => {
      const chip = document.createElement('button');
      chip.className = 'choice-chip';
      chip.textContent = AI_RESPONSES[key].question;
      chip.addEventListener('click', () => this.handleChoice(key));
      this.choicesContainer.appendChild(chip);
    });
  }

  handleChoice(key) {
    if (this.isTyping) return;
    
    const choice = AI_RESPONSES[key];
    if (!choice) return;

    // 1. Add user question to chat
    const userMsg = this.addMessage(choice.question, 'user');
    this.scrollChat(userMsg);

    // 2. Disable chips temporarily
    this.toggleChipsState(true);

    // 3. Show typing indicator
    const typingBubble = this.showTypingIndicator();
    this.scrollChat(userMsg);

    // 4. Simulate response delay
    setTimeout(() => {
      // Remove typing bubble
      if (typingBubble) typingBubble.remove();
      
      // Add and stream response text with anchor to user message
      this.streamMessage(choice.answer, userMsg);
    }, 1200);
  }

  addMessage(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `message message-${sender} animate__animated animate__fadeInUp`;
    bubble.innerHTML = text;
    this.widgetBody.appendChild(bubble);
    return bubble;
  }

  showTypingIndicator() {
    const bubble = document.createElement('div');
    bubble.className = 'typing-bubble';
    bubble.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    this.widgetBody.appendChild(bubble);
    return bubble;
  }

  streamMessage(htmlContent, anchorElem) {
    this.isTyping = true;
    
    // Create an empty AI bubble
    const bubble = document.createElement('div');
    bubble.className = 'message message-ai animate__animated animate__fadeInUp';
    this.widgetBody.appendChild(bubble);

    // Smoothly scroll so user question and top of answer bubble are clearly visible
    if (anchorElem) {
      this.scrollChat(anchorElem);
    }
    
    // Create offscreen temp container to parse HTML tags correctly
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Flatten content into readable tokens (text characters and html tags)
    const tokens = [];
    let i = 0;
    while (i < htmlContent.length) {
      if (htmlContent[i] === '<') {
        const endIdx = htmlContent.indexOf('>', i);
        tokens.push(htmlContent.substring(i, endIdx + 1));
        i = endIdx + 1;
      } else {
        tokens.push(htmlContent[i]);
        i++;
      }
    }

    let tokenIndex = 0;
    const interval = setInterval(() => {
      if (tokenIndex < tokens.length) {
        bubble.innerHTML += tokens[tokenIndex];
        tokenIndex++;
      } else {
        clearInterval(interval);
        this.isTyping = false;
        this.toggleChipsState(false);
      }
    }, 12);
  }

  toggleChipsState(disabled) {
    const chips = this.choicesContainer.querySelectorAll('.choice-chip');
    chips.forEach(chip => {
      chip.disabled = disabled;
      if (disabled) {
        chip.style.opacity = '0.5';
        chip.style.cursor = 'not-allowed';
      } else {
        chip.style.opacity = '1';
        chip.style.cursor = 'pointer';
      }
    });
  }

  scrollChat(anchorElem) {
    if (anchorElem && typeof anchorElem.scrollIntoView === 'function') {
      anchorElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      this.widgetBody.scrollTop = this.widgetBody.scrollHeight;
    }
  }
}

// Export widget instance
window.aiWidget = new AiWidget();
