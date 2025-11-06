// ====================================================================================================================
// --- KHAI BÁO BIẾN TOÀN CỤC VÀ DỮ LIỆU ---
// ====================================================================================================================
let MOCK_QUESTIONS = [];
let STUDENT_LIST = []; 

// Khai báo các phần tử DOM
const quizContainer = document.getElementById('quiz-container');
const submitBtn = document.getElementById('submit-btn');
const startBtn = document.getElementById('start-btn');
const resultDiv = document.getElementById('result');
const timerDisplay = document.getElementById('timer-display');
const studentInfoDiv = document.getElementById('student-info');

const studentClassInput = document.getElementById('student-class');
const studentSttInput = document.getElementById('student-stt');
const studentNameInput = document.getElementById('student-name');
// ⭐ DOM MỚI: Cho bộ đếm truy cập (đã thêm vào index.html)
const visitCounterElement = document.getElementById('visit-counter');

// ⭐ Thay thế bằng Web app URL đã Deploy
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxHbV4GQguSKfE4erMY-XLC73LZLt9cIiiFbpDoaC1omilg4LXDTP5CgRDlrMufT0Ixcg/exec';

// Biến trạng thái Quiz
let questions = [];
let userAnswers = {};
let studentInfo = { TEN: '', LƠP: '', STT: '' };

// Biến cho Timer và Kết quả
let timerInterval = null;
let startTime = 0;
let timeTaken = '';
let quizResults = JSON.parse(localStorage.getItem('quizResults')) || [];

// ====================================================================================================================
// --- CÁC HÀM TIỆN ÍCH ---
// ====================================================================================================================

// --- HÀM MÃ HÓA/GIẢI MÃ BASE64 ---
function encodeAnswer(answerString) {
    if (!answerString) return '';
    return btoa(unescape(encodeURIComponent(answerString)));
}

function decodeAnswer(encodedString) {
    if (!encodedString) return '';
    try {
        return decodeURIComponent(escape(atob(encodedString)));
    } catch (e) {
        console.error("Lỗi giải mã:", e);
        return '';
    }
}
// -------------------------------------------------------------------

// Chuyển chuỗi đáp án (từ JSON) thành mảng các chuỗi chuẩn hóa.
function parseCorrectAnswer(correctAnswerString) {
    if (!correctAnswerString) return [];
    return String(correctAnswerString).toUpperCase().split(',').map(s => s.trim()).filter(s => s);
}

// Hàm trộn mảng (Fisher-Yates Shuffle)
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// ====================================================================================================================
// --- TẢI DỮ LIỆU TỪ JSON (CHỨC NĂNG CỐT LÕI) ---
// ====================================================================================================================
async function loadExternalData() {
    try {
        // Tải danh sách câu hỏi (questions.json)
        const questionsResponse = await fetch('questions.json');
        if (!questionsResponse.ok) throw new Error('Lỗi khi tải questions.json');
        MOCK_QUESTIONS = await questionsResponse.json();

        // Mã hóa đáp án đúng ngay sau khi tải
        MOCK_QUESTIONS.forEach(q => {
            if (q.Dap_an_dung) {
                q.Dap_an_dung = encodeAnswer(q.Dap_an_dung);
            }
        });

        // Tải danh sách học sinh (students.json)
        const studentsResponse = await fetch('students.json');
        if (!studentsResponse.ok) throw new Error('Lỗi khi tải students.json');
        STUDENT_LIST = await studentsResponse.json();
        
        // Cập nhật giao diện sau khi tải thành công
        console.log("Đã tải thành công dữ liệu câu hỏi và học sinh.");
        startBtn.removeAttribute('disabled');
        startBtn.textContent = 'BẮT ĐẦU BÀI THI';

        // Gắn Listener sau khi dữ liệu đã được tải thành công
        studentClassInput.addEventListener('change', updateStudentName);
        studentSttInput.addEventListener('input', updateStudentName); 
        
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ JSON:", error);
        startBtn.textContent = 'LỖI TẢI DỮ LIỆU: Vui lòng kiểm tra Console';
        startBtn.setAttribute('disabled', 'disabled');
        alert("LỖI: Không thể tải dữ liệu bài kiểm tra. Vui lòng kiểm tra các file 'questions.json' và 'students.json'.");
    }
}

// ====================================================================================================================
// --- CHỨC NĂNG TRA CỨU HỌC SINH ---
// ====================================================================================================================
function updateStudentName() {
    const selectedClass = studentClassInput.value.trim();
    const enteredStt = parseInt(studentSttInput.value.trim()); 

    if (selectedClass && enteredStt > 0 && STUDENT_LIST.length > 0) {
        const foundStudent = STUDENT_LIST.find(student => 
            // Kiểm tra khớp với khóa LƠP và STT trong JSON
            student.LƠP === selectedClass && parseInt(student.STT) === enteredStt
        );

        if (foundStudent) {
            studentNameInput.value = foundStudent.TEN; 
            studentNameInput.setAttribute('disabled', 'disabled'); 
            studentNameInput.style.backgroundColor = '#e9ecef';
            studentNameInput.style.fontWeight = 'bold';
            studentNameInput.setAttribute('placeholder', foundStudent.TEN);
        } else {
            studentNameInput.value = '';
            studentNameInput.removeAttribute('disabled');
            studentNameInput.style.backgroundColor = '#ffffff';
            studentNameInput.style.fontWeight = 'normal';
            studentNameInput.setAttribute('placeholder', 'Không tìm thấy tên học sinh này.');
        }
    } else {
        studentNameInput.value = '';
        studentNameInput.removeAttribute('disabled');
        studentNameInput.style.backgroundColor = '#ffffff';
        studentNameInput.style.fontWeight = 'normal';
        studentNameInput.setAttribute('placeholder', 'Tên hiển thị tự động sau khi chọn Lớp và nhập STT');
    }
}
window.updateStudentName = updateStudentName;

// ====================================================================================================================
// --- CHỨC NĂNG HẸN GIỜ ---
// ====================================================================================================================
function updateTimerDisplay() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
    const seconds = String(elapsedTime % 60).padStart(2, '0');
    timerDisplay.innerHTML = `⏰ Thời gian làm bài: ${minutes}:${seconds}`;
}

function startTimer() {
    startTime = Date.now();
    timerDisplay.classList.remove('hidden');
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
        const seconds = String(elapsedTime % 60).padStart(2, '0');
        timeTaken = `${minutes}:${seconds}`;
    }
    timerDisplay.classList.add('hidden');
}

// ====================================================================================================================
// --- CHỨC NĂNG MỚI: HIỂN THỊ ĐÁP ÁN KHI CẦN ---
// ====================================================================================================================
function toggleReview() {
    const reviewDetails = document.getElementById('review-details');
    const toggleButton = document.getElementById('toggle-review-btn');
    
    if (reviewDetails.classList.contains('hidden')) {
        reviewDetails.classList.remove('hidden');
        toggleButton.textContent = 'ẨN CHI TIẾT CÂU SAI 👆';
        toggleButton.classList.remove('bg-gray-500');
        toggleButton.classList.add('bg-gray-700');
    } else {
        reviewDetails.classList.add('hidden');
        toggleButton.textContent = 'XEM CHI TIẾT CÂU SAI 👇';
        toggleButton.classList.remove('bg-gray-700');
        toggleButton.classList.add('bg-gray-500');
    }
}
window.toggleReview = toggleReview;

// ====================================================================================================================
// --- CÁC BƯỚC BÀI THI ---
// ====================================================================================================================
function startQuiz() {
    studentInfo.TEN = studentNameInput.value.trim();
    studentInfo.LƠP = studentClassInput.value.trim();
    studentInfo.STT = studentSttInput.value.trim();

    // Kiểm tra: Đã có tên, lớp, STT VÀ ô Tên đã bị khóa (tra cứu thành công)
    if (!studentInfo.TEN || !studentInfo.LƠP || !studentInfo.STT || !studentNameInput.hasAttribute('disabled')) {
        alert('Vui lòng nhập đầy đủ Lớp, STT, và đảm bảo Tên học sinh đã được tra cứu thành công (ô tên bị khóa).');
        return;
    }
    
    studentInfoDiv.classList.add('hidden');
    loadQuestions();
    quizContainer.classList.remove('hidden');
    submitBtn.classList.remove('hidden');
    startTimer();
    
    // ⭐ GỌI HÀM GỬI TÍN HIỆU BẮT ĐẦU ⭐
    signalQuizStart();
}
window.startQuiz = startQuiz;

// Tải câu hỏi (Chọn ngẫu nhiên 20 câu)
function loadQuestions() {
    let shuffledQuestions = shuffleArray(MOCK_QUESTIONS); 
    questions = shuffledQuestions.slice(0, 20); 
    
    questions.forEach(q => {
        q.ID = String(q.ID); 
        userAnswers[q.ID] = [];
    });

    localStorage.setItem('studentInfo', JSON.stringify(studentInfo));
    localStorage.setItem('quizQuestions', JSON.stringify(questions));
    localStorage.setItem('userAnswers', JSON.stringify(userAnswers));
        
    renderQuiz();
}

// Hiển thị các câu hỏi ra giao diện
function renderQuiz() {
    let html = '';
    questions.forEach((q, index) => {
        const isMultiChoice = String(q.Loai_cau_hoi).toLowerCase() === 'multiple';
        const inputType = isMultiChoice ? 'checkbox' : 'radio';
        const inputName = `question_${q.ID}`;

        html += `
            <div class="question-box" data-id="${q.ID}">
                <h4 class="text-lg font-medium mb-3">Câu ${index + 1}: ${q.Cau_hoi} <span class="text-sm text-gray-500">(${isMultiChoice ? 'Nhiều đáp án' : 'Một đáp án'})</span></h4>
                <div class="options space-y-2">
        `;

        let answerOptions = [];
        if (q.Dap_an_A) answerOptions.push({ key: 'A', value: q.Dap_an_A });
        if (q.Dap_an_B) answerOptions.push({ key: 'B', value: q.Dap_an_B });
        if (q.Dap_an_C) answerOptions.push({ key: 'C', value: q.Dap_an_C });
        if (q.Dap_an_D) answerOptions.push({ key: 'D', value: q.Dap_an_D });
            
        const shuffledOptions = shuffleArray(answerOptions); 
        q.shuffledOptions = shuffledOptions;  
            
        const currentAnswers = userAnswers[q.ID] || [];

        shuffledOptions.forEach(opt => {
            const isChecked = currentAnswers.includes(opt.key);
                
            html += `
                <label class="option-label">
                    <input type="${inputType}" name="${inputName}" value="${opt.key}" ${isChecked ? 'checked' : ''} onchange="saveAnswer('${q.ID}', this)">
                    ${opt.value}
                </label>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });
    quizContainer.innerHTML = html;
}

// Lưu đáp án
function saveAnswer(questionId, inputElement) {
    const answerKey = inputElement.value;
    const isMulti = inputElement.type === 'checkbox';

    if (isMulti) {
        let currentAnswers = userAnswers[questionId] || [];
        if (inputElement.checked) {
            if (!currentAnswers.includes(answerKey)) {
                currentAnswers.push(answerKey);
            }
        } else {
            currentAnswers = currentAnswers.filter(key => key !== answerKey);
        }
        userAnswers[questionId] = currentAnswers;
    } else {
        userAnswers[questionId] = [answerKey];
    }
    
    localStorage.setItem('userAnswers', JSON.stringify(userAnswers));
}
window.saveAnswer = saveAnswer;

// Nộp bài và chấm điểm
function submitQuiz() {
    if (!confirm('Bạn có chắc chắn muốn nộp bài? Bài làm sẽ không thể thay đổi sau khi nộp.')) {
        return;
    }
    
    stopTimer();
    let score = 0;
    const reviewData = [];
    
    questions.forEach((q, index) => {
        const questionId = q.ID;
        
        // Giải mã đáp án trước khi parse
        const decodedAnswer = decodeAnswer(q.Dap_an_dung);
        const correctAnswerKeys = parseCorrectAnswer(decodedAnswer).sort(); 
        
        const userAnswerKeys = (userAnswers[questionId] || []).sort(); 
        
        const isCorrect = 
            userAnswerKeys.length === correctAnswerKeys.length && 
            userAnswerKeys.every((key, i) => key === correctAnswerKeys[i]);
            
        if (isCorrect) {
            score++;
        }
        
        reviewData.push({
            index: index + 1,
            question: q.Cau_hoi,
            isCorrect: isCorrect,
            correct: correctAnswerKeys,
            user: userAnswerKeys,
            explanation: q.Giai_thich,
        });
    });

    saveResultLocally(score, timeTaken); 
    renderResults(score, reviewData, timeTaken);     

    // Lưu điểm làm bài lên Google Sheet
    sendResultToGoogleSheet(score, timeTaken);

    // Dọn dẹp localStorage
    localStorage.removeItem('studentInfo');
    localStorage.removeItem('quizQuestions');
    localStorage.removeItem('userAnswers');
}
window.submitQuiz = submitQuiz;


// ====================================================================================================================
// --- CHỨC NĂNG TÍCH HỢP GOOGLE SHEETS & THỐNG KÊ ---
// ====================================================================================================================

/**
 * Gửi kết quả bài thi cuối cùng lên Google Sheets (Sheet1).
 */
async function sendResultToGoogleSheet(score, time) {
    // 1. Chuẩn bị dữ liệu để gửi
    const formData = new FormData();
    formData.append('HoTen', studentInfo.TEN);
    formData.append('Lop', studentInfo.LƠP);
    formData.append('STT', studentInfo.STT);
    formData.append('DiemSo', `${score} / ${questions.length}`); // Format điểm
    formData.append('ThoiGian', time);

    try {
        const response = await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            body: formData, // Gửi không kèm action => Apps Script hiểu là ghi kết quả
        });

        // Đọc phản hồi dưới dạng JSON
        const result = await response.json(); 

        if (result.status === 'success') {
            console.log("Đã gửi kết quả lên Google Sheets thành công.");
        } else {
            console.error("Lỗi khi gửi kết quả lên Google Sheets:", result.message);
        }

    } catch (error) {
        console.error("Lỗi kết nối hoặc lỗi mạng khi gửi dữ liệu:", error);
    }
}

/**
 * Gửi tín hiệu POST tới Apps Script kèm tham số action=start để ghi nhận trạng thái 'DangLam' (Sheet TrangThai).
 */
async function signalQuizStart() {
    const startApiUrl = GOOGLE_SHEET_URL + '?action=start'; 

    const formData = new FormData();
    formData.append('Lop', studentInfo.LƠP);
    formData.append('STT', studentInfo.STT);
    formData.append('action', 'start');
    
    try {
        const response = await fetch(startApiUrl, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (result.status === 'started') {
            console.log('Tín hiệu bắt đầu đã gửi thành công.');
        } else {
            console.warn('Lỗi gửi tín hiệu bắt đầu:', result.message);
        }
    } catch (error) {
        console.error('Lỗi kết nối khi gửi tín hiệu bắt đầu:', error);
    }
}

/**
 * Cập nhật số người đang làm bài (Lấy dữ liệu GET từ Apps Script)
 * Yêu cầu GET mặc định sẽ trả về count active users.
 */
async function updateActiveUsersCount() {
    const counterDisplay = document.getElementById('active-users-counter');
    if (!counterDisplay) return;

    // Yêu cầu GET mặc định (Apps Script sẽ gọi countActiveUsers)
    const activeUsersApiUrl = GOOGLE_SHEET_URL; 
    
    try {
        const response = await fetch(activeUsersApiUrl); 
        const result = await response.json();
        
        if (result && typeof result.count === 'number') {
            counterDisplay.innerHTML = `Hiện đang có: <span class="text-xl font-bold text-red-600">${result.count}</span> người làm bài.`;
        } else {
            counterDisplay.textContent = 'Đang tải thống kê...';
        }

    } catch (error) {
        console.error("Lỗi khi tải số người đang làm bài:", error);
        counterDisplay.textContent = 'Lỗi tải...';
    }
}

/**
 * Tăng và lấy tổng số lượt truy cập (Yêu cầu GET action=count)
 */
async function updateVisitCounter() {
    if (!visitCounterElement) return; 

    // Gửi yêu cầu GET đến Apps Script kèm tham số action=count
    const counterApiUrl = GOOGLE_SHEET_URL + '?action=count'; 
    
    try {
        const response = await fetch(counterApiUrl);
        const result = await response.json();
        
        if (result && typeof result.totalVisits === 'number') {
            // Cập nhật số lượt truy cập lên giao diện
            visitCounterElement.textContent = result.totalVisits.toLocaleString('en-US'); 
        } else {
            visitCounterElement.textContent = '0';
        }
    } catch (error) {
        console.error("Lỗi khi tải bộ đếm truy cập:", error);
        visitCounterElement.textContent = 'Lỗi';
    }
}

// ====================================================================================================================
// --- LƯU TRỮ VÀ HIỂN THỊ KẾT QUẢ ---
// ====================================================================================================================

// Lưu kết quả vào LocalStorage
function saveResultLocally(score, time) {
    const newResult = {
        TEN: studentInfo.TEN,
        LƠP: studentInfo.LƠP,
        STT: studentInfo.STT,
        score: score,
        total: questions.length,
        time: time,
        date: new Date().toLocaleString('vi-VN'),
    };
    
    quizResults.push(newResult);
    if (quizResults.length > 5) {
        quizResults = quizResults.slice(-5);
    }
    localStorage.setItem('quizResults', JSON.stringify(quizResults));
}

// Hiển thị kết quả
function renderResults(score, reviewData, time) {
    quizContainer.classList.add('hidden');
    submitBtn.classList.add('hidden');
    resultDiv.classList.remove('hidden');

    let resultHtml = `
        <div id="result-summary" class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-md">
            <h2 class="text-2xl font-bold mb-2">🎉 KẾT QUẢ</h2>
            <p class="text-lg">Họ và Tên: <span class="font-semibold">${studentInfo.TEN}</span> (Lớp: ${studentInfo.LƠP})</p>
            <p class="text-xl">Điểm số: <span class="text-green-600 font-extrabold">${score} / ${questions.length}</span></p>
            <p class="text-base">Thời gian hoàn thành: ${time}</p>
        </div>

        <button id="toggle-review-btn" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mb-6" onclick="toggleReview()">
            XEM CHI TIẾT CÂU SAI 👇
        </button>
        
        <div id="review-details" class="hidden">
            <h3 class="text-xl font-semibold mb-4 text-gray-700">Chi tiết các câu làm SAI:</h3>
    `;
    
    let wrongAnswerCount = 0; 
    
    reviewData.forEach(item => {
        // CHỈ HIỂN THỊ CÂU SAI
        if (!item.isCorrect) {
            wrongAnswerCount++; 
            
            const statusClass = 'bg-red-100 border-red-500';
            const statusText = 'SAI';

            resultHtml += `
                <div class="p-4 mb-4 border-l-4 ${statusClass} rounded-md">
                    <p class="font-bold text-gray-800">Câu ${item.index}: ${item.question}</p>
                    <p class="mt-2">Trạng thái: <span class="text-red-600 font-bold">${statusText}</span></p>
                    <p>Đáp án của bạn: 
                        <span class="text-red-600">${item.user.join(', ') || 'Chưa chọn'}</span>
                    </p>
                    <p>Đáp án đúng: <span class="text-green-600 font-semibold">${item.correct.join(', ')}</span></p>
                    <div class="explanation">${item.explanation}</div>
                </div>
            `;
        }
    });
    
    // Thẻ đóng div cho review-details
    resultHtml += `</div>`; 

    // THÊM THÔNG BÁO VÀ XỬ LÝ ẨN NÚT CHO TRƯỜNG HỢP KHÔNG CÓ CÂU SAI
    if (wrongAnswerCount === 0) {
        resultHtml += `<div class="bg-green-100 text-green-700 p-4 rounded-md mb-6">
            Tuyệt vời! Bạn đã hoàn thành xuất sắc, không có câu nào sai! 💯
        </div>`;
    }
    
    resultHtml += renderHistory();

    resultDiv.innerHTML = resultHtml;
    
    // ⭐ LOGIC TỐI ƯU: Chỉ kiểm tra và ẩn nút sau khi innerHTML đã được gán
    if (wrongAnswerCount === 0) {
        const toggleButton = document.getElementById('toggle-review-btn');
        if(toggleButton) {
            toggleButton.classList.add('hidden');
        }
    }
}
window.renderResults = renderResults;

// Hiển thị lịch sử làm bài
function renderHistory() {
    let historyHtml = `
        <h3 class="text-xl font-semibold mt-10 mb-4 text-gray-700 border-t pt-4">Lịch sử làm bài gần nhất (trên máy này)</h3>
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

    [...quizResults].reverse().forEach(r => {
        historyHtml += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${r.TEN}</td>
                <td class="px-6 py-4 whitespace-nowrap">${r.LƠP}</td>
                <td class="px-6 py-4 whitespace-nowrap font-bold text-green-600">${r.score} / ${r.total}</td>
                <td class="px-6 py-4 whitespace-nowrap">${r.time}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${r.date}</td>
            </tr>
        `;
    });

    historyHtml += `
            </tbody>
        </table>
    `;
    return historyHtml;
}

// ====================================================================================================================
// --- TÍNH NĂNG BẢO MẬT GIAO DIỆN ---
// ====================================================================================================================

function enableContentSecurity() {
    // Chặn click chuột phải (Context menu)
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        alert('Tính năng nhấp chuột phải đã bị khóa trong quá trình làm bài.');
    });

    // Chặn chọn văn bản (Ngăn copy/paste bằng Ctrl+C)
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
}

// ====================================================================================================================
// --- KHỞI TẠO APP ---
// ====================================================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Kích hoạt bảo mật giao diện
    enableContentSecurity();
    
    // ⭐ 1. Khởi tạo và Hiển thị bộ đếm truy cập (Chỉ gọi 1 lần)
    updateVisitCounter();

    // ⭐ 2. Thêm div hiển thị số người đang làm bài vào Student Info
    const counterDisplay = document.createElement('div');
    counterDisplay.id = 'active-users-counter';
    counterDisplay.className = 'text-center text-sm font-semibold text-red-600 mb-4';
    studentInfoDiv.prepend(counterDisplay); // Đặt trên form nhập liệu

    // ⭐ 3. Cập nhật số người đang làm bài và thiết lập Interval
    updateActiveUsersCount(); 
    setInterval(updateActiveUsersCount, 15000); // Cập nhật mỗi 15 giây
    
    startBtn.setAttribute('disabled', 'disabled');
    startBtn.textContent = 'Đang Tải Dữ Liệu...';
    // Khởi động quá trình tải dữ liệu
    loadExternalData();
});