import React, { useState, useEffect } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { CurriculumService, CurriculumBoard, CoverageSummary, CoverageTracking, CurriculumStandard } from '@/modules/curriculum/curriculumService';
import { UserProfileService } from '@/modules/user/userProfileService';

const CurriculumDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedBoard, setSelectedBoard] = useState<CurriculumBoard>('CBSE');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [coverageSummary, setCoverageSummary] = useState<CoverageSummary | null>(null);
  const [coverageDetails, setCoverageDetails] = useState<CoverageTracking[]>([]);
  const [standardsList, setStandardsList] = useState<CurriculumStandard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && selectedGrade && selectedSubject) {
      loadCoverageData();
    }
  }, [user, selectedBoard, selectedGrade, selectedSubject]);

  const loadCoverageData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userProfile = await UserProfileService.getUserByAuth0Id(user.sub);
      if (!userProfile) return;

      // Load coverage summary
      const summary = await CurriculumService.getCoverageSummary(
        userProfile.id,
        selectedBoard,
        selectedGrade,
        selectedSubject
      );
      setCoverageSummary(summary);

      // Load detailed coverage
      const details = await CurriculumService.getCoverageDetails(
        userProfile.id,
        selectedBoard,
        selectedGrade,
        selectedSubject
      );
      setCoverageDetails(details);

      // Load all standards for this combination
      const standards = await CurriculumService.getStandards(
        selectedBoard,
        selectedGrade,
        selectedSubject
      );
      setStandardsList(standards);
    } catch (error) {
      console.error('Error loading coverage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCoveredStandardIds = () => {
    return new Set(coverageDetails.map(d => d.standard_id));
  };

  const getStandardStatus = (standardId: string) => {
    const covered = coverageDetails.find(d => d.standard_id === standardId);
    return covered ? covered.coverage_status : 'Pending';
  };

  const getStandardLessonCount = (standardId: string) => {
    const covered = coverageDetails.find(d => d.standard_id === standardId);
    return covered ? covered.total_lessons : 0;
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">lock</span>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Authentication Required</h3>
        <p className="text-slate-600 dark:text-slate-400">Please sign in to view curriculum coverage.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-4xl">school</span>
          <h2 className="text-2xl font-bold">Curriculum Coverage Dashboard</h2>
        </div>
        <p className="text-white/80">Track your progress across curriculum standards</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Select Curriculum</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Board</label>
            <select
              value={selectedBoard}
              onChange={e => setSelectedBoard(e.target.value as CurriculumBoard)}
              className="w-full form-select rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            >
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
              <option value="State Board">State Board</option>
              <option value="IB">IB</option>
              <option value="Cambridge">Cambridge</option>
              <option value="Common Core">Common Core</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Grade</label>
            <input
              type="text"
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              placeholder="e.g., 10"
              className="w-full form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subject</label>
            <input
              type="text"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              placeholder="e.g., Mathematics"
              className="w-full form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Coverage Summary */}
      {coverageSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Standards</span>
              <span className="material-symbols-outlined text-slate-400">format_list_numbered</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{coverageSummary.total_standards}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Covered</span>
              <span className="material-symbols-outlined text-green-500">check_circle</span>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{coverageSummary.covered_standards}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Coverage %</span>
              <span className="material-symbols-outlined text-primary">insights</span>
            </div>
            <p className="text-3xl font-bold text-primary">{coverageSummary.coverage_percentage.toFixed(1)}%</p>
            <div className="mt-2 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-500"
                style={{ width: `${coverageSummary.coverage_percentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Standards List */}
      {standardsList.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Standards Overview ({selectedBoard} - Grade {selectedGrade} - {selectedSubject})
          </h3>
          
          {loading ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
              <p className="mt-2 text-slate-600 dark:text-slate-400">Loading standards...</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {standardsList.map(standard => {
                const status = getStandardStatus(standard.id);
                const lessonCount = getStandardLessonCount(standard.id);
                const isCovered = getCoveredStandardIds().has(standard.id);
                
                return (
                  <div
                    key={standard.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCovered
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-bold text-sm ${
                            isCovered ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {standard.standard_code}
                          </span>
                          {standard.category && (
                            <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-400">
                              {standard.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{standard.standard_description}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {isCovered && (
                          <div className="text-right">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Lessons</div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">{lessonCount}</div>
                          </div>
                        )}
                        <span className={`material-symbols-outlined text-2xl ${
                          isCovered ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'
                        }`}>
                          {isCovered ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!selectedGrade || !selectedSubject ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">tune</span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Select Curriculum Details</h3>
          <p className="text-slate-600 dark:text-slate-400">Choose board, grade, and subject to view coverage</p>
        </div>
      ) : standardsList.length === 0 && !loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">library_books</span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Standards Found</h3>
          <p className="text-slate-600 dark:text-slate-400">
            No curriculum standards available for {selectedBoard} - Grade {selectedGrade} - {selectedSubject}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
            Standards can be imported or added manually in settings
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default CurriculumDashboard;
