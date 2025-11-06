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

// ⭐ DOM MỚI: Cho bộ đếm truy cập
const visitCounterElement = document.getElementById('visit-counter');

// ⭐ LƯU Ý: Biến GOOGLE_SHEET_URL KHÔNG CÒN ĐƯỢC DÙNG TRỰC TIẾP VỚI fetch() ⭐
// Thay vào đó, nó được gán cho thuộc tính `action` trong index.html
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
// --- TẢI DỮ LIỆU TỪ JSON VÀ TRA CỨU HỌC SINH ---
// ====================================================================================================================
async function loadExternalData() {
    try {
        const questionsResponse = await fetch('questions.json');
        if (!questionsResponse.ok) throw new Error('Lỗi khi tải questions.json');
        MOCK_QUESTIONS = await questionsResponse.json();
        
        MOCK_QUESTIONS.forEach(q => {
            if (q.Dap_an_dung) {
                q.Dap_an_dung = encodeAnswer(q.Dap_an_dung);
            }
        });

        const studentsResponse = await fetch('students.json');
        if (!studentsResponse.ok) throw new Error('Lỗi khi tải students.json');
        STUDENT_LIST = await studentsResponse.json();
        
        console.log("Đã tải thành công dữ liệu câu hỏi và học sinh.");
        startBtn.removeAttribute('disabled');
        startBtn.textContent = 'BẮT ĐẦU BÀI THI';

        studentClassInput.addEventListener('change', updateStudentName);
        studentSttInput.addEventListener('input', updateStudentName); 
        
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ JSON:", error);
        startBtn.textContent = 'LỖI TẢI DỮ LIỆU';
        startBtn.setAttribute('disabled', 'disabled');
    }
}

function updateStudentName() {
    const selectedClass = studentClassInput.value.trim();
    const enteredStt = parseInt(studentSttInput.value.trim()); 

    if (selectedClass && enteredStt > 0 && STUDENT_LIST.length > 0) {
        const foundStudent = STUDENT_LIST.find(student => 
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
// --- CHỨC NĂNG HẸN GIỜ & REVIEW ---
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
// --- CÁC BƯỚC BÀI THI & CHẤM ĐIỂM ---
// ====================================================================================================================
function startQuiz() {
    studentInfo.TEN = studentNameInput.value.trim();
    studentInfo.LƠP = studentClassInput.value.trim();
    studentInfo.STT = studentSttInput.value.trim();

    if (!studentInfo.TEN || !studentInfo.LƠP || !studentInfo.STT || !studentNameInput.hasAttribute('disabled')) {
        alert('Vui lòng nhập đầy đủ Lớp, STT, và đảm bảo Tên học sinh đã được tra cứu thành công (ô tên bị khóa).');
        return;
    }
    
    studentInfoDiv.classList.add('hidden');
    loadQuestions();
    quizContainer.classList.remove('hidden');
    submitBtn.classList.remove('hidden');
    startTimer();
    
    // ⭐ Vô hiệu hóa signalQuizStart do lỗi CORS - Khách hàng đã chấp nhận tính năng này không hoạt động ⭐
    // signalQuizStart(); 
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
        
        const decodedAnswer = decodeAnswer(q.Dap_an_dung);
        const correctAnswerKeys = parseCorrectAnswer(decodedAnswer).sort(); 
        
        const userAnswerKeys = (userAnswers[questionId] || []).sort(); 
        
        const isCorrect = 
            userAnswerKeys.length === correctAnswerKeys.length && 
            userAnswerKeys.every((key, i) => key === correctAnswerKeys[i]);
            
        if (isCorrect) {
            score++;
        }
        
        const optionsMap = {
            'A': q.Dap_an_A,
            'B': q.Dap_an_B,
            'C': q.Dap_an_C,
            'D': q.Dap_an_D,
        };

        reviewData.push({
            index: index + 1,
            question: q.Cau_hoi,
            isCorrect: isCorrect,
            correctKeys: correctAnswerKeys, 
            userKeys: userAnswerKeys,       
            options: optionsMap,            
            explanation: q.Giai_thich,
        });
    });

    saveResultLocally(score, timeTaken); 
    renderResults(score, reviewData, timeTaken);     

    // ⭐ CẬP NHẬT: Gửi điểm bằng Form Submit (khắc phục CORS) ⭐
    sendResultToGoogleSheet(score, timeTaken);

    // Dọn dẹp localStorage
    localStorage.removeItem('studentInfo');
    localStorage.removeItem('quizQuestions');
    localStorage.removeItem('userAnswers');
}
window.submitQuiz = submitQuiz;


// ====================================================================================================================
// --- KHẮC PHỤC CORS: GỬI KẾT QUẢ BẰNG FORM SUBMIT ---
// ====================================================================================================================

/**
 * Gửi kết quả bài thi cuối cùng lên Google Sheets (Sheet1) bằng cách submit form ẩn.
 * Phương pháp này tránh lỗi CORS, nhưng sẽ mở một tab mới.
 */
function sendResultToGoogleSheet(score, time) {
    const form = document.getElementById('submission-form');
    
    // Cập nhật dữ liệu cho form
    document.getElementById('form-action').value = ''; // Ghi kết quả điểm
    document.getElementById('form-name').value = studentInfo.TEN;
    document.getElementById('form-class').value = studentInfo.LƠP;
    document.getElementById('form-stt').value = studentInfo.STT;
    document.getElementById('form-score').value = `${score} / ${questions.length}`; 
    document.getElementById('form-time').value = time;

    // Gửi form
    form.submit();
    
    console.log("Đã gửi kết quả lên Google Sheets thông qua Form Submit.");
}

// ----------------------------------------------------------------------------------
// ⭐ VÔ HIỆU HÓA CÁC HÀM SỬ DỤNG FETCH() GÂY LỖI CORS TRONG MÔI TRƯỜNG GH PAGES ⭐
// ----------------------------------------------------------------------------------

/**
 * Gửi tín hiệu POST (bị lỗi CORS với fetch) => Vô hiệu hóa
 */
async function signalQuizStart() {
    console.warn("signalQuizStart đã bị vô hiệu hóa để tránh lỗi CORS.");
}

/**
 * Cập nhật số người đang làm bài (GET) (bị lỗi CORS với fetch) => Vô hiệu hóa
 */
async function updateActiveUsersCount() {
    const counterDisplay = document.getElementById('active-users-counter');
    if (counterDisplay) {
        counterDisplay.innerHTML = 'Thống kê đang <span class="text-red-600 font-bold">tạm tắt</span> (Lỗi CORS).';
    }
}

/**
 * Tăng và lấy tổng số lượt truy cập (GET action=count) (bị lỗi CORS với fetch) => Vô hiệu hóa
 */
async function updateVisitCounter() {
    if (visitCounterElement) {
        visitCounterElement.textContent = 'Tính năng thống kê đang tạm tắt.';
    }
}


// ====================================================================================================================
// --- LƯU TRỮ VÀ HIỂN THỊ KẾT QUẢ (CẬP NHẬT REVIEW) ---
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

// Hiển thị kết quả (Đã sửa để hiển thị nội dung đáp án chi tiết)
// Hiển thị kết quả (Đã sửa LẦN CUỐI để hiển thị toàn bộ nội dung đáp án)
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
            
            // ⭐ LOGIC: HÀM ÁNH XẠ KEY (A,B,C,D) THÀNH NỘI DUNG ⭐
            const getUserAnswersContent = () => {
                if (item.userKeys.length === 0) return 'Chưa chọn';
                
                return item.userKeys.map(key => {
                    const content = item.options[key] || `[Không tìm thấy nội dung cho ${key}]`;
                    // Đã thêm thẻ span để làm nổi bật (A), (B)
                    return `<span class="font-semibold text-gray-700">(${key})</span> ${content}`; 
                }).join('<br>'); // Dùng <br> để xuống dòng cho mỗi đáp án
            };
            
            const getCorrectAnswersContent = () => {
                return item.correctKeys.map(key => {
                    const content = item.options[key] || `[Không tìm thấy nội dung cho ${key}]`;
                    return `<span class="font-semibold text-gray-700">(${key})</span> ${content}`;
                }).join('<br>'); // Dùng <br> để xuống dòng cho mỗi đáp án
            };
            // ⭐ KẾT THÚC LOGIC ÁNH XẠ ⭐

            // ⭐ ĐOẠN MÃ HTML ĐƯỢC CHÈN ĐÃ SỬA ⭐
            resultHtml += `
                <div class="p-4 mb-4 border-l-4 ${statusClass} rounded-md">
                    <p class="font-bold text-gray-800">Câu ${item.index}: ${item.question}</p>
                    <p class="mt-2">Trạng thái: <span class="text-red-600 font-bold">${statusText}</span></p>
                    
                    <p class="mt-2 text-sm">
                        <span class="font-medium block mb-1">Đáp án của bạn:</span> 
                        <span class="text-red-600 block pl-4">${getUserAnswersContent()}</span>
                    </p>
                    
                    <p class="text-sm mt-2">
                        <span class="font-medium block mb-1">Đáp án đúng:</span> 
                        <span class="text-green-600 font-semibold block pl-4">${getCorrectAnswersContent()}</span>
                    </p>
                    
                    <div class="explanation mt-3 border-t pt-2 text-sm text-gray-700">
                        <span class="font-bold">Giải thích:</span> ${item.explanation || 'Không có giải thích.'}
                    </div>
                </div>
            `;
        }
    });
    // Thẻ đóng div cho review-details
    resultHtml += `</div>`; 

    if (wrongAnswerCount === 0) {
        resultHtml += `<div class="bg-green-100 text-green-700 p-4 rounded-md mb-6">
            Tuyệt vời! Bạn đã hoàn thành xuất sắc, không có câu nào sai! 💯
        </div>`;
    }
    
    resultHtml += renderHistory();

    resultDiv.innerHTML = resultHtml;
    
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
// --- TÍNH NĂNG BẢO MẬT GIAO DIỆN & KHỞI TẠO ---
// ====================================================================================================================

function enableContentSecurity() {
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        alert('Tính năng nhấp chuột phải đã bị khóa trong quá trình làm bài.');
    });

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    enableContentSecurity();
    
    // ⭐ Vô hiệu hóa/Thay thế các tính năng thống kê bị lỗi CORS ⭐
    updateVisitCounter();
    updateActiveUsersCount(); // Hàm này không cần setInterval nữa vì nó đã bị vô hiệu hóa

    startBtn.setAttribute('disabled', 'disabled');
    startBtn.textContent = 'Đang Tải Dữ Liệu...';
    loadExternalData();
});