const fs = require('fs');
const path = require('path');

class CallAnalyzer {
  constructor() {
    this.calls = [];
    this.userPhone = '';
  }

  // 解析话单文件（中国移动格式）
  parseCSV(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const calls = [];
      
      // 跳过前几行的表头信息
      let startIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('开始时间')) {
          startIndex = i + 1;
          break;
        }
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.includes('合计') || !line.includes(',')) continue;
        
        // 解析CSV格式（逗号分隔）
        const parts = this.parseCSVLine(line);
        if (parts.length >= 6) {
          const call = {
            type: parts[0]?.trim() || '',
            phone: parts[1]?.trim() || '',
            startTime: parts[2]?.trim() || '',
            duration: parts[3]?.trim() || parts[4]?.trim() || '',
            durationSec: this.parseDuration(parts[3]?.trim() || parts[4]?.trim() || '0秒'),
            location: parts[5]?.trim() || '',
            fee: parts[6]?.trim() || '0',
            product: parts[7]?.trim() || '',
            remark: parts[8]?.trim() || ''
          };
          
          // 过滤有效号码
          if (call.phone && call.phone.replace(/\D/g, '').length >= 7 && call.phone !== this.userPhone) {
            calls.push(call);
          }
        }
      }
      
      return calls;
    } catch (e) {
      console.error(`解析文件失败 ${filePath}:`, e.message);
      return [];
    }
  }

  // 解析时长（支持 00:05:32 或 5分32秒 格式）
  parseDuration(duration) {
    if (!duration) return 0;
    
    // 尝试 00:00:00 格式
    let match = duration.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (match) {
      return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
    }
    
    // 尝试 X分Y秒 格式
    match = duration.match(/(\d+)分(\d+)秒/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    
    // 尝试 X秒 格式
    match = duration.match(/(\d+)秒/);
    if (match) {
      return parseInt(match[1]);
    }
    
    return 0;
  }

  // 解析CSV行（处理引号内的逗号）
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  // 批量解析目录下的所有话单文件
  parseDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    
    const files = fs.readdirSync(dirPath);
    const allCalls = [];
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        // 递归处理子目录
        const subCalls = this.parseDirectory(fullPath);
        allCalls.push(...subCalls);
      } else if (file.endsWith('.csv') || file.endsWith('.txt')) {
        const calls = this.parseCSV(fullPath);
        allCalls.push(...calls);
      }
    }
    
    this.calls = allCalls;
    return allCalls;
  }

  // 设置用户手机号码
  setUserPhone(phone) {
    this.userPhone = phone || '';
    // 过滤掉自己的号码
    this.calls = this.calls.filter(c => c.phone !== phone);
  }

  // 1. 通话统计
  getStatistics() {
    const totalCalls = this.calls.length;
    let totalDuration = this.calls.reduce((sum, c) => sum + c.durationSec, 0);

    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const seconds = totalDuration % 60;

    return {
      totalCalls,
      totalDuration: `${hours}小时${minutes}分${seconds}秒`,
      avgDuration: totalCalls > 0 ? `${Math.round(totalDuration / totalCalls)}秒` : '0秒',
      callTypes: {
        incoming: this.calls.filter(c => c.type === '被叫').length,
        outgoing: this.calls.filter(c => c.type === '主叫').length
      }
    };
  }

  // 2. 联系人分析
  getContactAnalysis() {
    const contactMap = {};
    
    this.calls.forEach(call => {
      const phone = call.phone;
      if (!contactMap[phone]) {
        contactMap[phone] = {
          phone,
          count: 0,
          totalDuration: 0,
          incoming: 0,
          outgoing: 0,
          lastCall: null
        };
      }
      contactMap[phone].count++;
      contactMap[phone].totalDuration += call.durationSec;
      
      if (call.type === '被叫') contactMap[phone].incoming++;
      else contactMap[phone].outgoing++;
      
      if (!contactMap[phone].lastCall || call.startTime > contactMap[phone].lastCall) {
        contactMap[phone].lastCall = call.startTime;
      }
    });

    // 转换为数组并排序
    const contacts = Object.values(contactMap)
      .map(c => {
        const d = c.totalDuration;
        return {
          ...c,
          durationStr: `${Math.floor(d / 60)}分${d % 60}秒`
        };
      })
      .sort((a, b) => b.count - a.count);

    // 识别陌生人（只通话1次，通话时间<10秒）
    const strangers = contacts.filter(c => 
      c.count === 1 && c.totalDuration < 10
    );

    // 识别高频联系人（通话次数>20）
    const frequent = contacts.filter(c => c.count > 20);

    return {
      totalContacts: contacts.length,
      topContacts: contacts.slice(0, 50),
      strangers: strangers.length,
      strangerList: strangers.slice(0, 50),
      frequentContacts: frequent.length,
      frequentList: frequent.slice(0, 50)
    };
  }

  // 3. 时间分析
  getTimeAnalysis() {
    const hourDistribution = new Array(24).fill(0);
    const dayDistribution = new Array(7).fill(0);
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    this.calls.forEach(call => {
      // 解析时间格式: 2025-01-02 09:23:55
      const match = call.startTime.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
      if (match) {
        const hour = parseInt(match[4]);
        const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        const dayOfWeek = date.getDay();
        
        hourDistribution[hour]++;
        dayDistribution[dayOfWeek]++;
      }
    });

    // 找出熬夜时段（22:00-06:00）
    let nightCalls = 0;
    for (let i = 22; i < 24; i++) nightCalls += hourDistribution[i];
    for (let i = 0; i < 6; i++) nightCalls += hourDistribution[i];

    // 找出通话高峰
    const maxCount = Math.max(...hourDistribution);
    const peakHours = hourDistribution
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count === maxCount && maxCount > 0)
      .map(h => `${h.hour.toString().padStart(2, '0')}:00`);
    
    const peakDay = days[dayDistribution.indexOf(Math.max(...dayDistribution)) || 0];

    return {
      hourDistribution,
      dayDistribution: dayDistribution.map((count, i) => ({ day: days[i], count })),
      peakHours,
      peakDay,
      nightCalls,
      nightRate: this.calls.length > 0 ? Math.round(nightCalls / this.calls.length * 100) : 0
    };
  }

  // 生成完整报告
  generateReport() {
    const stats = this.getStatistics();
    const contacts = this.getContactAnalysis();
    const time = this.getTimeAnalysis();

    return {
      statistics: stats,
      contacts,
      time
    };
  }

  // 生成Markdown报告
  generateMarkdownReport() {
    const report = this.generateReport();
    
    let md = `# 📱 话单分析报告\n\n`;
    
    md += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    
    md += `## 一、通话统计\n\n`;
    md += `| 指标 | 数值 |\n`;
    md += `|------|------|\n`;
    md += `| 总通话次数 | ${report.statistics.totalCalls} 次 |\n`;
    md += `| 总通话时长 | ${report.statistics.totalDuration} |\n`;
    md += `| 平均单次时长 | ${report.statistics.avgDuration} |\n`;
    md += `| 联系人数 | ${report.contacts.totalContacts} 人 |\n`;
    md += `| 收到呼叫 | ${report.statistics.callTypes.incoming} 次 |\n`;
    md += `| 呼叫他人 | ${report.statistics.callTypes.outgoing} 次 |\n`;
    
    md += `\n## 二、联系人分析\n\n`;
    
    md += `### 🔥 通话频次 TOP10\n\n`;
    md += `| 排名 | 号码 | 次数 | 时长 | 最后通话 |\n`;
    md += `|------|------|------|------|----------|\n`;
    report.contacts.topContacts.slice(0, 10).forEach((c, i) => {
      md += `| ${i + 1} | ${c.phone} | ${c.count} 次 | ${c.durationStr} | ${c.lastCall?.split(' ')[0] || '-'} |\n`;
    });
    
    if (report.contacts.strangerList.length > 0) {
      md += `\n### 👤 陌生人识别（仅1次通话，通话<10秒）\n\n`;
      md += report.contacts.strangerList.map(c => `- ${c.phone}`).join('\n');
      md += `\n\n> 共识别 ${report.contacts.strangers} 个陌生人\n`;
    }
    
    md += `\n## 三、时间分析\n\n`;
    md += `| 指标 | 数值 |\n`;
    md += `|------|------|\n`;
    md += `| 通话高峰时段 | ${report.time.peakHours.join('、') || '-'} |\n`;
    md += `| 通话高峰日 | ${report.time.peakDay} |\n`;
    md += `| 熬夜通话次数 | ${report.time.nightCalls} 次 |\n`;
    md += `| 熬夜通话占比 | ${report.time.nightRate}% |\n`;
    
    md += `\n### 按小时分布\n\n`;
    report.time.hourDistribution.forEach((count, hour) => {
      md += `${hour.toString().padStart(2, '0')}:00 - ${count}次\n`;
    });
    
    md += `\n### 按星期分布\n\n`;
    report.time.dayDistribution.forEach(d => {
      md += `${d.day}: ${d.count}次\n`;
    });
    
    return md;
  }
}

module.exports = { CallAnalyzer };

// CLI 使用
if (require.main === module) {
  const args = process.argv.slice(2);
  const dirPath = args[0] || './calls';
  const userPhone = args[1] || '';
  
  const analyzer = new CallAnalyzer();
  analyzer.parseDirectory(dirPath);
  if (userPhone) {
    analyzer.setUserPhone(userPhone);
  }
  
  console.log(analyzer.generateMarkdownReport());
}
