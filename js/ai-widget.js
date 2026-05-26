/* 
  School of Character (SoC) - Pojok Hope
  AI CHARACTER ASSISTANT WIDGET LOGIC
*/

const AI_RESPONSES = {
  honesty: {
    question: "Bagaimana melatih Kejujuran anak?",
    answer: "Melatih kejujuran pada anak paling efektif melalui metode <strong>Appreciative Feedback</strong>. Ketika anak berani berkata jujur (walaupun melakukan kesalahan), apresiasi keberaniannya terlebih dahulu sebelum mendiskusikan kesalahannya.<br><br>Di SoC Pojok Hope, kami menerapkan kebiasaan refleksi harian dan <em>'Honesty Circle'</em>, di mana anak-anak diajak mengevaluasi tindakan mereka dalam suasana yang aman dan penuh penerimaan."
  },
  math: {
    question: "Ide belajar Matematika yang seru?",
    answer: "Ubah angka abstrak menjadi konkret! Kami menggunakan metode <strong>CPA (Concrete-Pictorial-Abstract)</strong>.<br><br>Cobalah gunakan benda di rumah seperti sendok, buah, atau mainan untuk berhitung. Di Pojok Hope, kami belajar perkalian menggunakan permainan dadu interaktif dan belanja simulasi di pasar mini kelas. Anak-anak belajar matematika tanpa menyadari mereka sedang belajar!"
  },
  english: {
    question: "Cara asyik belajar Bahasa Inggris?",
    answer: "Gunakan pendekatan <strong>Total Physical Response (TPR)</strong> dan <strong>Storytelling</strong>. Hubungkan kosakata dengan gerakan tubuh atau lagu.<br><br>Hindari menghafal rumus tata bahasa (grammar drills) di usia dini. Fokuslah pada keberanian berbicara. Di Pojok Hope, kami membiasakan bernyanyi bersama, role-play menjadi tokoh cerita, dan sesi <em>'English Speaking Zone'</em> yang interaktif."
  },
  outdoor: {
    question: "Metode Outdoor Learning di SoC?",
    answer: "Outdoor Learning adalah salah satu program unggulan kami! Kami membawa kelas ke alam terbuka di sekitar <strong>Desa Dutohe, Kabila</strong>.<br><br>Anak-anak belajar sains dan matematika secara langsung dengan meneliti ekosistem sawah, menghitung kerikil, serta melatih karakter kepemimpinan dan gotong royong melalui permainan outbound berkelompok."
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
    this.addMessage("Halo! Saya Asisten Karakter SoC. Ada yang bisa saya bantu diskusikan mengenai tumbuh kembang dan metode belajar menyenangkan (Fun Learning) ananda hari ini?", 'ai');
    
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
    this.addMessage(choice.question, 'user');
    this.scrollChat();

    // 2. Disable chips temporarily
    this.toggleChipsState(true);

    // 3. Show typing indicator
    const typingBubble = this.showTypingIndicator();
    this.scrollChat();

    // 4. Simulate response delay
    setTimeout(() => {
      // Remove typing bubble
      if (typingBubble) typingBubble.remove();
      
      // Add and stream response text
      this.streamMessage(choice.answer);
    }, 1500);
  }

  addMessage(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `message message-${sender}`;
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

  streamMessage(htmlContent) {
    this.isTyping = true;
    
    // Create an empty AI bubble
    const bubble = document.createElement('div');
    bubble.className = 'message message-ai';
    this.widgetBody.appendChild(bubble);
    
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
        this.scrollChat();
      } else {
        clearInterval(interval);
        this.isTyping = false;
        this.toggleChipsState(false);
      }
    }, 15); // Fast, snappy typing speed
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

  scrollChat() {
    this.widgetBody.scrollTop = this.widgetBody.scrollHeight;
  }
}

// Export widget instance
window.aiWidget = new AiWidget();
