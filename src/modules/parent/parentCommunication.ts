/**
 * Parent Communication Service
 * Handles email generation and progress reports for parents
 */

interface StudentProgressData {
  studentName: string;
  grade: string;
  weekStart: string;
  weekEnd: string;
  quizzesCompleted: number;
  averageScore: number;
  pendingAssignments: number;
  strengths?: string[];
  weaknesses?: string[];
  recentScores?: number[];
}

interface ParentContact {
  parentName: string;
  parentEmail: string;
  studentName: string;
}

/**
 * Generate weekly summary email template
 */
export function generateWeeklySummaryEmail(
  studentProgress: StudentProgressData,
  parentContact: ParentContact,
  teacherName: string,
  schoolName: string
): string {
  const { studentName, grade, weekStart, weekEnd, quizzesCompleted, averageScore, pendingAssignments } = studentProgress;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Progress Summary - ${studentName}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 5px 0 0 0;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
      color: #374151;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin: 25px 0;
    }
    .stat-card {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin: 5px 0;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
    }
    .section {
      margin: 25px 0;
      padding: 20px;
      background: #f9fafb;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
      margin: 0 0 10px 0;
    }
    .section-content {
      color: #4b5563;
      line-height: 1.6;
    }
    .footer {
      background: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📚 Weekly Progress Summary</h1>
      <p>${weekStart} - ${weekEnd}</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      <div class="greeting">
        Dear ${parentContact.parentName},
      </div>
      
      <p style="color: #4b5563; line-height: 1.6;">
        This report provides an overview of ${studentName}'s academic progress for the past week. 
        Overall, ${studentName} has been ${averageScore >= 80 ? 'performing excellently' : averageScore >= 60 ? 'making good progress' : 'showing effort'} 
        in ${grade}.
      </p>
      
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${quizzesCompleted}</div>
          <div class="stat-label">Quizzes Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${averageScore}%</div>
          <div class="stat-label">Average Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${pendingAssignments}</div>
          <div class="stat-label">Pending Tasks</div>
        </div>
      </div>
      
      <!-- Performance Section -->
      <div class="section">
        <div class="section-title">📈 Performance Analysis</div>
        <div class="section-content">
          <strong>Overall Performance:</strong>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${averageScore}%;"></div>
          </div>
          <p style="margin: 10px 0 5px 0;">
            ${averageScore >= 80 
              ? '🌟 Excellent work! ' + studentName + ' demonstrates strong understanding of the material.'
              : averageScore >= 60
              ? '👍 Good progress! ' + studentName + ' is developing well in most areas.'
              : '💪 Keep trying! ' + studentName + ' is working hard and showing improvement.'
            }
          </p>
        </div>
      </div>
      
      ${studentProgress.strengths && studentProgress.strengths.length > 0 ? `
      <div class="section">
        <div class="section-title">✨ Strengths</div>
        <div class="section-content">
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${studentProgress.strengths.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      </div>
      ` : ''}
      
      ${studentProgress.weaknesses && studentProgress.weaknesses.length > 0 ? `
      <div class="section">
        <div class="section-title">🎯 Areas for Improvement</div>
        <div class="section-content">
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${studentProgress.weaknesses.map(w => `<li>${w}</li>`).join('')}
          </ul>
          <p style="margin-top: 10px; font-size: 14px; color: #6b7280;">
            Recommendation: Additional practice in these areas would be beneficial. 
            Consider reviewing study materials and encouraging regular homework completion.
          </p>
        </div>
      </div>
      ` : ''}
      
      ${pendingAssignments > 0 ? `
      <div class="section" style="border-left-color: #f59e0b; background: #fffbeb;">
        <div class="section-title" style="color: #b45309;">⏰ Upcoming Deadlines</div>
        <div class="section-content" style="color: #92400e;">
          ${studentName} has <strong>${pendingAssignments}</strong> pending assignment${pendingAssignments > 1 ? 's' : ''} 
          that require${pendingAssignments === 1 ? 's' : ''} attention. Please encourage timely completion to maintain progress.
        </div>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #4b5563; margin-bottom: 15px;">
          View detailed progress and upcoming assignments
        </p>
        <a href="#" class="btn">Access Student Portal</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 5px 0;"><strong>${schoolName}</strong></p>
      <p style="margin: 0;">Teacher: ${teacherName}</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
        This is an automated report. For questions or concerns, please contact your teacher directly.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate assessment alert email
 */
export function generateAssessmentAlertEmail(
  studentName: string,
  assessmentTitle: string,
  score: number,
  maxScore: number,
  parentContact: ParentContact,
  teacherName: string,
  notes?: string
): string {
  const percentage = Math.round((score / maxScore) * 100);
  const performanceLevel = percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : 'Needs Improvement';
  const color = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Assessment Result - ${studentName}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: ${color}; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .score-card { text-align: center; padding: 30px; background: #f9fafb; border-radius: 8px; margin: 20px 0; }
    .score { font-size: 64px; font-weight: bold; color: ${color}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Assessment Result</h1>
    </div>
    <div class="content">
      <p>Dear ${parentContact.parentName},</p>
      <p>${studentName} has completed: <strong>${assessmentTitle}</strong></p>
      
      <div class="score-card">
        <div class="score">${percentage}%</div>
        <p style="font-size: 18px; margin: 10px 0;">${score} / ${maxScore}</p>
        <p style="color: #6b7280;">Performance: <strong>${performanceLevel}</strong></p>
      </div>
      
      ${notes ? `<p style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid ${color};">${notes}</p>` : ''}
      
      <p style="margin-top: 30px; color: #6b7280;">Best regards,<br>${teacherName}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate custom parent message template
 */
export function generateCustomParentMessage(
  subject: string,
  message: string,
  parentContact: ParentContact,
  teacherName: string,
  schoolName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: #667eea; color: white; padding: 30px; }
    .content { padding: 30px; line-height: 1.8; color: #374151; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">${subject}</h1>
    </div>
    <div class="content">
      <p>Dear ${parentContact.parentName},</p>
      ${message.split('\n').map(para => `<p>${para}</p>`).join('')}
      <p style="margin-top: 30px;">Best regards,<br><strong>${teacherName}</strong></p>
    </div>
    <div class="footer">
      <p style="margin: 0;"><strong>${schoolName}</strong></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Download email as HTML file
 */
export function downloadEmailTemplate(htmlContent: string, filename: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy email HTML to clipboard
 */
export async function copyEmailToClipboard(htmlContent: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(htmlContent);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
