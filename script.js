// ==================== CẤU HÌNH CHUNG & COOKIES ====================
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    // Mã hóa nội dung (đặc biệt là xuống dòng) để tránh lỗi cookie
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
    // Có thể thêm âm thanh winner ở đây
}

function closeModal() {
    document.getElementById('modal-result').style.display = "none";
}

// ==================== TAB NAVIGATION ====================
function openGame(gameId) {
    $('.tab-content').hide();
    $('.tab-btn').removeClass('active');
    
    $('#' + gameId).fadeIn();
    // Tìm nút bấm tương ứng để active
    const buttons = document.querySelectorAll('.tab-btn');
    if(gameId == 'game-random') buttons[0].classList.add('active');
    if(gameId == 'game-box') buttons[1].classList.add('active');
    if(gameId == 'game-wheel') {
        buttons[2].classList.add('active');
        initWheel(); // Vẽ lại vòng quay khi mở tab để tránh lỗi kích thước
    }
}

// ==================== GAME 1: QUAY SỐ ====================
$(document).ready(function() {
    // Load setting từ cookie
    let min = getCookie("minNum");
    let max = getCookie("maxNum");
    if(min) $('#minNum').val(min);
    if(max) $('#maxNum').val(max);
});

function playRandomNumber() {
    let min = parseInt($('#minNum').val());
    let max = parseInt($('#maxNum').val());
    
    // Lưu cookie
    setCookie("minNum", min, 30);
    setCookie("maxNum", max, 30);

    if (min >= max) { alert("Số bắt đầu phải nhỏ hơn số kết thúc!"); return; }

    let count = 0;
    let loop = setInterval(() => {
        let rand = Math.floor(Math.random() * (max - min + 1)) + min;
        $('#random-result').text(rand);
        count++;
        if(count > 20) { // Chạy 20 lần rồi dừng
            clearInterval(loop);
            showModal("Con số may mắn: " + rand);
        }
    }, 80);
}

// ==================== GAME 2: BỐC THĂM ====================
$(document).ready(function() {
    let giftList = getCookie("giftList");
    if(!giftList) giftList = "Xe máy SH\niPhone 15 Pro\nVoucher 500k\nChúc bạn may mắn";
    $('#txtGiftList').val(giftList);
});

function toggleSettings(id) {
    $('#' + id).slideToggle();
}

function saveGiftSettings() {
    let list = $('#txtGiftList').val();
    setCookie("giftList", list, 30);
    alert("Đã lưu danh sách quà!");
    toggleSettings('box-settings');
}

function playLuckyDraw() {
    let listStr = $('#txtGiftList').val();
    let items = listStr.split('\n').filter(item => item.trim() !== "");
    
    if(items.length === 0) { alert("Hết quà rồi!"); return; }

    // Hiệu ứng rung hộp quà
    $('.lucky-icon').css('animation', 'none');
    setTimeout(() => $('.lucky-icon').css('animation', 'bounce 0.5s infinite'), 10);

    // Xử lý kết quả sau 1.5s
    setTimeout(() => {
        let randomIndex = Math.floor(Math.random() * items.length);
        let result = items[randomIndex];
        showModal(result);
        
        $('.lucky-icon').css('animation', 'bounce 2s infinite'); // Trả lại animation chậm

        // Nếu chọn xóa quà đã bốc
        if($('#chkRemoveGift').is(':checked')) {
            items.splice(randomIndex, 1);
            let newList = items.join('\n');
            $('#txtGiftList').val(newList);
            setCookie("giftList", newList, 30); // Cập nhật cookie luôn
        }
    }, 1500);
}

// ==================== GAME 3: VÒNG QUAY (CORE LOGIC) ====================
// Logic Canvas được viết lại gọn hơn để chạy mượt mà
let segments = [];
let colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
let wheelCtx;
let wheelCanvas;
let isSpinning = false;
let currentRotation = 0; // Góc quay hiện tại
let spinSpeed = 0;
let animationFrameId;

$(document).ready(function() {
    let wheelData = getCookie("wheelItems");
    if(!wheelData) wheelData = "10k\n20k\n50k\n100k\nChúc may mắn\nThêm lượt";
    $('#txtWheelItems').val(wheelData);
    initWheelFromInput();
});

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
    
    // Resize cho đẹp trên mobile nếu cần (Code CSS đã xử lý phần hiển thị)
    // Vẽ vòng quay tĩnh lần đầu
    drawWheel(0);
}

function drawWheel(rotationAngle) {
    if(!wheelCtx) return;
    let centerX = wheelCanvas.width / 2;
    let centerY = wheelCanvas.height / 2;
    let radius = wheelCanvas.width / 2 - 10; // Chừa lề
    let arc = (2 * Math.PI) / segments.length;

    wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
    
    wheelCtx.save();
    wheelCtx.translate(centerX, centerY);
    wheelCtx.rotate(rotationAngle); // Xoay khung hình

    segments.forEach((segment, i) => {
        let angle = i * arc;
        wheelCtx.beginPath();
        wheelCtx.fillStyle = segment.color;
        wheelCtx.moveTo(0, 0);
        wheelCtx.arc(0, 0, radius, angle, angle + arc);
        wheelCtx.lineTo(0, 0);
        wheelCtx.fill();

        // Vẽ Text
        wheelCtx.save();
        wheelCtx.fillStyle = "white";
        wheelCtx.translate(Math.cos(angle + arc / 2) * (radius - 50), Math.sin(angle + arc / 2) * (radius - 50));
        wheelCtx.rotate(angle + arc / 2 + Math.PI); // Xoay chữ hướng vào tâm
        wheelCtx.font = "bold 16px Arial";
        wheelCtx.fillText(segment.label, -wheelCtx.measureText(segment.label).width / 2, 5);
        wheelCtx.restore();
    });

    wheelCtx.restore();
}

// Xử lý nút quay
$('#spin-btn').click(function() {
    if(isSpinning) return;
    isSpinning = true;
    
    // Tốc độ quay ngẫu nhiên
    spinSpeed = Math.random() * 0.2 + 0.3; // Tốc độ ban đầu (rad/frame)
    let deceleration = 0.992; // Độ ma sát (càng gần 1 càng lâu dừng)
    
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
    // Tính góc hiện tại (đã normalize về 0-2PI)
    // Do canvas xoay xuôi chiều kim đồng hồ, mà kim chỉ ở góc 270 độ (trên cùng - hoặc style CSS xoay)
    // Logic đơn giản: Kim chỉ ở vị trí 12h (tương đương -PI/2 trong canvas).
    // Chúng ta cần tính xem segment nào đang chạm vào góc đó.
    
    let normalizedRotation = currentRotation % (2 * Math.PI);
    
    // Góc của kim chỉ (đang là 12h = 1.5 PI hoặc -0.5 PI)
    // Vì ta xoay canvas, nên thực chất kim đứng yên, mảng segments xoay.
    // Góc va chạm thực tế = (2PI - normalizedRotation) + offset của kim
    
    let pointerAngle = (3 * Math.PI / 2); // 270 độ
    let relativeAngle = (pointerAngle - normalizedRotation + 2 * Math.PI) % (2 * Math.PI);
    
    let winningIndex = Math.floor(relativeAngle / arc);
    showModal("Kết quả: " + segments[winningIndex].label);
}
