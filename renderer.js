// 导航切换
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    
    // 切换导航状态
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    // 切换页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    
    // 如果是统计/联系人/时间页面，刷新数据
    if (page === 'statistics' || page === 'contacts' || page === 'time') {
      refreshPageData(page);
    }
  });
});

// 标签页切换
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.dataset.tab;
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
  });
});

// 全局变量
let selectedFiles = [];
let currentData = {
  statistics: null,
  contacts: null,
  time: null
};

// 选择文件
async function selectFiles() {
  const files = await window.electronAPI.selectFiles();
  if (files.length > 0) {
    selectedFiles = files;
    renderFileList();
    showNotification(`已选择 ${files.length} 个文件`, 'success');
  }
}

// 渲染文件列表
function renderFileList() {
  const container = document.getElementById('fileList');
  if (selectedFiles.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = selectedFiles.map((file, index) => `
    <div class="file-item">
      <span class="name">📄 ${file.split('/').pop()}</span>
      <span class="size" onclick="removeFile(${index})" style="cursor: pointer; color: #f5576c;">✕ 移除</span>
    </div>
  `).join('');
}

// 移除文件
function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
}

// 设置用户手机号
async function setUserPhone() {
  const phone = document.getElementById('userPhone').value.trim();
  await window.electronAPI.setUserPhone(phone);
  showNotification('用户号码已设置', 'info');
}

// 开始分析
async function startAnalysis() {
  if (selectedFiles.length === 0) {
    showNotification('请先选择话单文件', 'error');
    return;
  }
  
  showNotification('正在分析话单...', 'info');
  
  try {
    const result = await window.electronAPI.parseFiles(selectedFiles);
    
    if (result.success) {
      showNotification(`分析完成！共 ${result.count} 条通话记录`, 'success');
      
      // 切换到统计页面
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelector('[data-page="statistics"]').classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-statistics').classList.add('active');
      
      refreshPageData('statistics');
    } else {
      showNotification(`分析失败: ${result.error}`, 'error');
    }
  } catch (e) {
    showNotification(`分析失败: ${e.message}`, 'error');
  }
}

// 清除数据
async function clearData() {
  await window.electronAPI.clearData();
  selectedFiles = [];
  renderFileList();
  document.getElementById('userPhone').value = '';
  currentData = { statistics: null, contacts: null, time: null };
  showNotification('数据已清除', 'info');
}

// 刷新页面数据
async function refreshPageData(page) {
  switch (page) {
    case 'statistics':
      await loadStatistics();
      break;
    case 'contacts':
      await loadContacts();
      break;
    case 'time':
      await loadTimeAnalysis();
      break;
  }
}

// 加载统计数据
async function loadStatistics() {
  const stats = await window.electronAPI.getStatistics();
  currentData.statistics = stats;
  
  document.getElementById('statTotalCalls').textContent = stats.totalCalls + ' 次';
  document.getElementById('statTotalDuration').textContent = stats.totalDuration;
  document.getElementById('statAvgDuration').textContent = stats.avgDuration;
  
  // 获取联系人统计
  const contacts = await window.electronAPI.getContacts();
  document.getElementById('statContacts').textContent = contacts.totalContacts + ' 人';
  
  // 主叫/被叫分布
  const incoming = stats.callTypes.incoming;
  const outgoing = stats.callTypes.outgoing;
  const total = incoming + outgoing;
  
  document.getElementById('incomingCount').textContent = `${incoming} 次 (${total > 0 ? Math.round(incoming/total*100) : 0}%)`;
  document.getElementById('outgoingCount').textContent = `${outgoing} 次 (${total > 0 ? Math.round(outgoing/total*100) : 0}%)`;
  
  document.getElementById('incomingBar').style.width = total > 0 ? `${incoming/total*100}%` : '0%';
  document.getElementById('outgoingBar').style.width = total > 0 ? `${outgoing/total*100}%` : '0%';
}

// 加载联系人分析
async function loadContacts() {
  const contacts = await window.electronAPI.getContacts();
  currentData.contacts = contacts;
  
  // 频次表格
  const freqHtml = contacts.topContacts.length > 0 
    ? contacts.topContacts.map((c, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${c.phone}</td>
          <td>${c.count} 次</td>
          <td>${c.durationStr}</td>
          <td>${c.lastCall?.split(' ')[0] || '-'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" style="text-align: center; color: #888;">暂无数据</td></tr>';
  document.getElementById('frequencyTable').innerHTML = freqHtml;
  
  // 陌生人表格
  const strangerHtml = contacts.strangerList.length > 0
    ? contacts.strangerList.map(c => `
        <tr>
          <td>${c.phone}</td>
          <td>${c.durationStr}</td>
          <td>${c.lastCall?.split(' ')[0] || '-'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3" style="text-align: center; color: #888;">暂无陌生人</td></tr>';
  document.getElementById('strangerTable').innerHTML = strangerHtml;
  
  // 高频联系人表格
  const frequentHtml = contacts.frequentList.length > 0
    ? contacts.frequentList.map(c => `
        <tr>
          <td>${c.phone}</td>
          <td>${c.count} 次</td>
          <td>${c.durationStr}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3" style="text-align: center; color: #888;">暂无高频联系人</td></tr>';
  document.getElementById('frequentTable').innerHTML = frequentHtml;
}

// 加载时间分析
async function loadTimeAnalysis() {
  const time = await window.electronAPI.getTimeAnalysis();
  currentData.time = time;
  
  document.getElementById('peakHours').textContent = time.peakHours.join('、') || '-';
  document.getElementById('peakDay').textContent = time.peakDay || '-';
  document.getElementById('nightCalls').textContent = time.nightCalls + ' 次';
  document.getElementById('nightRate').textContent = time.nightRate + '%';
  
  // 小时分布图
  const maxHour = Math.max(...time.hourDistribution);
  const hourBarsHtml = time.hourDistribution.map((count, hour) => {
    const height = maxHour > 0 ? (count / maxHour * 100) : 0;
    return `
      <div class="hour-bar" style="height: ${Math.max(height, 2)}%">
        <div class="tooltip">${hour}:00 - ${count}次</div>
      </div>
    `;
  }).join('');
  document.getElementById('hourBars').innerHTML = hourBarsHtml;
  
  // 星期分布图
  const maxDay = Math.max(...time.dayDistribution.map(d => d.count));
  const weekBarsHtml = time.dayDistribution.map(d => {
    const height = maxDay > 0 ? (d.count / maxDay * 100) : 0;
    return `
      <div class="week-item">
        <div class="week-bar">
          <div class="fill" style="height: ${height}%"></div>
        </div>
        <div class="day">${d.day}</div>
        <div class="count">${d.count}次</div>
      </div>
    `;
  }).join('');
  document.getElementById('weekBars').innerHTML = weekBarsHtml;
}

// 设置切换
function toggleSetting(element) {
  element.classList.toggle('active');
}

// 显示通知
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 初始化
console.log('话单分析工具已启动');
