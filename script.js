// ==================== 1. CẤU HÌNH & TIỆN ÍCH ====================
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + encodeURIComponent(cvalue) + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return decodeURIComponent(c.substring(name.length, c.length));
    }
    return "";
}

function showModal(text) {
    document.getElementById('modal-text').innerText = text;
    document.getElementById('modal-result').style.display = "block";
}

function closeModal() {
    document.getElementById('modal-result').style.display = "none";
}

// ==================== 2. KHỞI TẠO GAME (CHẠY KHI WEB LOAD XONG) ====================
$(document).ready(function() {
    console.log("Website đã tải xong. Bắt đầu khởi tạo game...");

    // --- GAME 1: Quay Số ---
    let min = getCookie("minNum");
    let max = getCookie("maxNum");
    if(min) $('#minNum').val(min);
    if(max) $('#maxNum').val(max);

    // --- GAME 2: Bốc Thăm (QUAN TRỌNG) ---
    let giftList = getCookie("giftList");
    if(!giftList) giftList = "Xe máy SH\niPhone 15 Pro\nVoucher 500k\nChúc bạn may mắn\nTai nghe Airpod\nBút bi cao cấp\nSổ tay";
    $('#txtGiftList').val(giftList);
    
    // Gọi hàm tạo hộp quà ngay lập tức
    renderLuckyGrid();

    // --- GAME 3: Vòng Quay ---
    let wheelData = getCookie("wheelItems");
    if(!wheelData) wheelData = "Uống 100%\nUống 50%\nNhấp môi\nNgười bên trái 100%\nNgười bên phải 100%\nĐồng khởi";
    $('#txtWheelItems').val(wheelData);
    initWheelFromInput();
});

// ==================== 3. LOGIC XỬ LÝ TAB ====================
function openGame(gameId) {
    $('.tab-content').hide();
    $('.tab-btn').removeClass('active');
    
    $('#' + gameId).fadeIn();
    
    // Active nút bấm
    const buttons = document.querySelectorAll('.tab-btn');
    if(gameId == 'game-random') buttons[0].classList.add('active');
    if(gameId == 'game-box') buttons[1].classList.add('active');
    if(gameId == 'game-wheel') {
        buttons[2].classList.add('active');
        // Vẽ lại vòng quay để tránh lỗi hiển thị khi ẩn/hiện
        setTimeout(initWheel, 100); 
    }
}

// ==================== 4. LOGIC GAME 1: QUAY SỐ ====================
function playRandomNumber() {
    let min = parseInt($('#minNum').val());
    let max = parseInt($('#maxNum').val());
    
    setCookie("minNum", min, 30);
    setCookie("maxNum", max, 30);

    if (min >= max) { alert("Số bắt đầu phải nhỏ hơn số kết thúc!"); return; }

    let count = 0;
    let loop = setInterval(() => {
        let rand = Math.floor(Math.random() * (max - min + 1)) + min;
        $('#random-result').text(rand);
        count++;
        if(count > 20) {
            clearInterval(loop);
            showModal("Con số may mắn: " + rand);
        }
    }, 80);
}

// ==================== 5. LOGIC GAME 2: BỐC THĂM ====================
function toggleSettings(id) {
    $('#' + id).slideToggle();
}

function saveGiftSettings() {
    let list = $('#txtGiftList').val();
    setCookie("giftList", list, 30);
    renderLuckyGrid(); 
    alert("Đã cập nhật danh sách quà!");
    toggleSettings('box-settings');
}

function renderLuckyGrid() {
    console.log("Đang tạo lưới quà..."); // Log kiểm tra
    let listStr = $('#txtGiftList').val();
    let items = listStr.split('\n').filter(item => item.trim() !== "");
    
    if(items.length > 99) {
        items = items.slice(0, 99);
        alert("Giới hạn tối đa 99 hộp quà!");
    }

    $('#gift-count-label').text(`Đang có ${items.length} hộp quà bí mật`);
    
    let gridHtml = '';
    items.forEach((item, index) => {
        gridHtml += `
            <div class="lucky-item" id="box-${index}" onclick="openBox(${index})">
                <i class="fa-solid fa-gift"></i>
                <span>Hộp ${index + 1}</span>
            </div>
        `;
    });

    $('#lucky-grid').html(gridHtml);
}

function openBox(index) {
    if ($(`#box-${index}`).hasClass('opened')) return;

    let listStr = $('#txtGiftList').val();
    let items = listStr.split('\n').filter(item => item.trim() !== "");

    if (items.length === 0) {
        alert("Hết quà rồi!");
        return;
    }

    // Chọn ngẫu nhiên quà
    let randomGiftIndex = Math.floor(Math.random() * items.length);
    let prizeName = items[randomGiftIndex];

    // Hiệu ứng mở
    let box = $(`#box-${index}`);
    box.find('i').attr('class', 'fa-solid fa-box-open'); 
    box.addClass('opened'); 

    showModal(prizeName);

    // Xử lý loại bỏ quà
    if ($('#chkRemoveGift').is(':checked')) {
        items.splice(randomGiftIndex, 1);
        let newList = items.join('\n');
        $('#txtGiftList').val(newList);
        setCookie("giftList", newList, 30);
        $('#gift-count-label').text(`Đang có ${items.length} hộp quà bí mật`);
    }
}

function resetLuckyGrid() {
    if(confirm("Bạn có muốn làm mới các hộp quà không?")) {
        renderLuckyGrid();
    }
}

// ==================== 6. LOGIC GAME 3: VÒNG QUAY ====================
let segments = [];
let colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
let wheelCtx;
let wheelCanvas;
let isSpinning = false;
let currentRotation = 0;
let spinSpeed = 0;
let animationFrameId;

function initWheelFromInput() {
    let val = $('#txtWheelItems').val();
    setCookie("wheelItems", val, 30);
    
    let items = val.split('\n').filter(i => i.trim() !== "");
    segments = items.map((label, index) => ({
        label: label,
        color: colors[index % colors.length]
    }));
    initWheel();
}

function initWheel() {
    wheelCanvas = document.getElementById('wheel');
    if(!wheelCanvas) return;
    wheelCtx = wheelCanvas.getContext('2d');
    drawWheel(currentRotation);
}

function drawWheel(rotationAngle) {
    if(!wheelCtx) return;
    let centerX = wheelCanvas.width / 2;
    let centerY = wheelCanvas.height / 2;
    let radius = wheelCanvas.width / 2 - 10;
    let arc = (2 * Math.PI) / segments.length;

    wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
    
    wheelCtx.save();
    wheelCtx.translate(centerX, centerY);
    wheelCtx.rotate(rotationAngle);

    segments.forEach((segment, i) => {
        let angle = i * arc;
        wheelCtx.beginPath();
        wheelCtx.fillStyle = segment.color;
        wheelCtx.moveTo(0, 0);
        wheelCtx.arc(0, 0, radius, angle, angle + arc);
        wheelCtx.lineTo(0, 0);
        wheelCtx.fill();

        wheelCtx.save();
        wheelCtx.fillStyle = "white";
        wheelCtx.translate(Math.cos(angle + arc / 2) * (radius - 50), Math.sin(angle + arc / 2) * (radius - 50));
        wheelCtx.rotate(angle + arc / 2 + Math.PI);
        wheelCtx.font = "bold 16px Arial";
        wheelCtx.fillText(segment.label, -wheelCtx.measureText(segment.label).width / 2, 5);
        wheelCtx.restore();
    });

    wheelCtx.restore();
}

$('#spin-btn').click(function() {
    if(isSpinning) return;
    isSpinning = true;
    spinSpeed = Math.random() * 0.2 + 0.3;
    let deceleration = 0.992;
    
    function animate() {
        if(spinSpeed < 0.002) {
            isSpinning = false;
            cancelAnimationFrame(animationFrameId);
            calculateWinner();
            return;
        }
        spinSpeed *= deceleration;
        currentRotation += spinSpeed;
        drawWheel(currentRotation);
        animationFrameId = requestAnimationFrame(animate);
    }
    animate();
});

function calculateWinner() {
    let arc = (2 * Math.PI) / segments.length;
    let normalizedRotation = currentRotation % (2 * Math.PI);
    let pointerAngle = (3 * Math.PI / 2); 
    let relativeAngle = (pointerAngle - normalizedRotation + 2 * Math.PI) % (2 * Math.PI);
    let winningIndex = Math.floor(relativeAngle / arc);
    showModal("Kết quả: " + segments[winningIndex].label);
}
