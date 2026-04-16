import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Grid as GridIcon, BarChart3, Eraser, Plus, Trash2, CalendarDays } from 'lucide-react';

// --- Utility: Local Storage Hook ---
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// --- Default Data ---
const DEFAULT_CATEGORIES = [
  { id: 'c1', name: 'Personal Care', color: '#4ade80' }, // Green
  { id: 'c2', name: 'Work & Career', color: '#60a5fa' }, // Blue
  { id: 'c3', name: 'Personal Dev', color: '#c084fc' }, // Purple
  { id: 'c4', name: 'Leisure', color: '#fbbf24' } // Yellow
];

const DEFAULT_ACTIVITIES = [
  { id: 'a1', categoryId: 'c1', name: 'Sleep', code: 'SL' },
  { id: 'a2', categoryId: 'c1', name: 'Meals', code: 'M' },
  { id: 'a3', categoryId: 'c2', name: 'Deep Work', code: 'W' },
  { id: 'a4', categoryId: 'c2', name: 'Meetings', code: 'MT' },
  { id: 'a5', categoryId: 'c3', name: 'Reading', code: 'R' },
  { id: 'a6', categoryId: 'c3', name: 'Exercise', code: 'EX' },
  { id: 'a7', categoryId: 'c4', name: 'Family Time', code: 'F' },
];

const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function App() {
  const [activeTab, setActiveTab] = useState('grid');
  const [categories, setCategories] = useLocalStorage('cc_categories', DEFAULT_CATEGORIES);
  const [activities, setActivities] = useLocalStorage('cc_activities', DEFAULT_ACTIVITIES);
  const [schedule, setSchedule] = useLocalStorage('cc_schedule', {});
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [newCatColor, setNewCatColor] = useState(COLORS[4]); // Default to a nice green
  
  // Drag-to-paint state
  const [isPainting, setIsPainting] = useState(false);

  // --- Helpers ---
  const getActivityColor = (activityId) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return 'transparent';
    const category = categories.find(c => c.id === activity.categoryId);
    return category ? category.color : '#374151';
  };

  const getActivityCode = (activityId) => {
    const activity = activities.find(a => a.id === activityId);
    return activity ? activity.code : '';
  };

  // --- Painting Logic ---
  const handleCellInteract = (day, hour, type) => {
    if (type === 'down') setIsPainting(true);
    if (type === 'up') setIsPainting(false);
    
    if (type === 'down' || (type === 'enter' && isPainting)) {
      const key = `${day}-${hour}`;
      if (selectedActivityId === 'eraser') {
        const newSchedule = { ...schedule };
        delete newSchedule[key];
        setSchedule(newSchedule);
      } else if (selectedActivityId) {
        setSchedule(prev => ({ ...prev, [key]: selectedActivityId }));
      }
    }
  };

  // Prevent default drag behavior to allow our custom painting
  useEffect(() => {
    const stopPainting = () => setIsPainting(false);
    window.addEventListener('mouseup', stopPainting);
    return () => window.removeEventListener('mouseup', stopPainting);
  }, []);

  // --- Calculations for Insights ---
  const stats = useMemo(() => {
    const activityHours = {};
    const categoryDailyHours = {}; // { Mon: { c1: 4, c2: 8 }, Tue: ... }
    
    // Initialize structures
    DAYS.forEach(day => {
      categoryDailyHours[day] = {};
      categories.forEach(c => categoryDailyHours[day][c.id] = 0);
    });
    activities.forEach(a => activityHours[a.id] = 0);

    // Crunch data
    Object.entries(schedule).forEach(([key, actId]) => {
      const [day] = key.split('-');
      const activity = activities.find(a => a.id === actId);
      
      if (activity) {
        activityHours[actId] = (activityHours[actId] || 0) + 1;
        categoryDailyHours[day][activity.categoryId] += 1;
      }
    });

    return { activityHours, categoryDailyHours };
  }, [schedule, activities, categories]);

  // --- Views ---
  const renderGrid = () => (
    <div className="flex flex-col h-full space-y-4">
      {/* Palette */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Select to Paint</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedActivityId('eraser')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              selectedActivityId === 'eraser' ? 'bg-red-500/20 border-red-500 text-red-400 border' : 'bg-gray-700 border-transparent text-gray-300 border hover:bg-gray-600'
            }`}
          >
            <Eraser size={16} /> <span>Eraser</span>
          </button>
          
          {activities.map(activity => {
            const color = getActivityColor(activity.id);
            const isSelected = selectedActivityId === activity.id;
            return (
              <button
                key={activity.id}
                onClick={() => setSelectedActivityId(activity.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border`}
                style={{
                  backgroundColor: isSelected ? `${color}40` : 'transparent',
                  borderColor: isSelected ? color : '#374151',
                  color: isSelected ? color : '#e5e7eb'
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span>{activity.name} ({activity.code})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The Spreadsheet Grid */}
      <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col shadow-lg">
        <div className="overflow-x-auto flex-1 p-4">
          <div className="min-w-[600px]">
            {/* Header Row */}
            <div className="flex border-b border-gray-700 pb-2 mb-2">
              <div className="w-16 flex-shrink-0 text-xs font-mono text-gray-500 text-right pr-4 pt-1">Time</div>
              {DAYS.map(day => (
                <div key={day} className="flex-1 text-center font-semibold text-gray-300 text-sm">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Grid Rows */}
            <div className="space-y-1 select-none">
              {HOURS.map(hour => (
                <div key={hour} className="flex items-center group">
                  <div className="w-16 flex-shrink-0 text-xs font-mono text-gray-500 text-right pr-4">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {DAYS.map(day => {
                    const key = `${day}-${hour}`;
                    const actId = schedule[key];
                    const color = getActivityColor(actId);
                    const code = getActivityCode(actId);
                    
                    return (
                      <div key={day} className="flex-1 px-0.5">
                        <div 
                          onMouseDown={() => handleCellInteract(day, hour, 'down')}
                          onMouseEnter={() => handleCellInteract(day, hour, 'enter')}
                          onMouseUp={() => handleCellInteract(day, hour, 'up')}
                          // Touch support fallback (tap to paint)
                          onTouchStart={() => handleCellInteract(day, hour, 'down')}
                          className="h-8 rounded cursor-pointer flex items-center justify-center text-xs font-bold transition-all hover:ring-2 hover:ring-white/50"
                          style={{
                            backgroundColor: actId ? color : '#1f2937',
                            color: actId ? '#00000080' : 'transparent',
                            border: actId ? `1px solid ${color}` : '1px solid #374151'
                          }}
                        >
                          {code}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsights = () => {
    // Total max possible hours per week
    const totalWeekHours = 24 * 7;
    const allocatedHours = Object.keys(schedule).length;
    const unallocatedHours = totalWeekHours - allocatedHours;

    return (
      <div className="space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Time Allocated</div>
            <div className="text-3xl font-bold text-white">{allocatedHours} <span className="text-lg text-gray-500 font-normal">/ {totalWeekHours}h</span></div>
            <div className="w-full bg-gray-700 h-2 mt-3 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: `${(allocatedHours/totalWeekHours)*100}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart: Activity Breakdown */}
          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">Weekly Activity Breakdown</h3>
            <div className="space-y-4">
              {activities.map(act => {
                const hrs = stats.activityHours[act.id] || 0;
                if (hrs === 0) return null;
                const pct = (hrs / totalWeekHours) * 100;
                const color = getActivityColor(act.id);
                
                return (
                  <div key={act.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{act.name}</span>
                      <span className="text-gray-400">{hrs}h ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart: Daily Distribution (Stacked Bar) */}
          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">Daily Category Distribution</h3>
            <div className="h-64 flex items-end space-x-2">
              {DAYS.map(day => (
                <div key={day} className="flex-1 flex flex-col justify-end h-full group relative">
                  <div className="flex flex-col-reverse w-full h-full rounded overflow-hidden">
                     {/* Unallocated block to push others down if needed, but flex-col-reverse handles it nicely if we just map categories */}
                     {categories.map(cat => {
                       const hrs = stats.categoryDailyHours[day][cat.id] || 0;
                       if (hrs === 0) return null;
                       const heightPct = (hrs / 24) * 100;
                       return (
                         <div 
                           key={cat.id} 
                           className="w-full transition-all hover:brightness-110 relative"
                           style={{ height: `${heightPct}%`, backgroundColor: cat.color }}
                           title={`${cat.name}: ${hrs}h`}
                         >
                           {heightPct > 5 && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-black/50 font-bold">{hrs}</span>}
                         </div>
                       );
                     })}
                  </div>
                  <div className="text-center text-xs text-gray-400 mt-2">{day}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compound Future Projections */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-6 rounded-xl border border-indigo-700 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center"><CalendarDays className="mr-2" /> The Compound Effect</h3>
          <p className="text-indigo-200 text-sm mb-6">If you stick to this exact weekly routine for the next 5 years, here is where your time will go.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activities.map(act => {
              const weeklyHrs = stats.activityHours[act.id] || 0;
              if (weeklyHrs === 0) return null;
              
              const yearlyHrs = weeklyHrs * 52;
              const fiveYearHrs = yearlyHrs * 5;
              const color = getActivityColor(act.id);

              let insight = "";
              if (fiveYearHrs > 8000) insight = "Mastery level! Equivalent to a 4-year degree.";
              else if (fiveYearHrs > 4000) insight = "Expert level! You'll be highly proficient.";
              else if (fiveYearHrs > 1000) insight = "Solid foundation! Enough to learn a new language.";
              else if (fiveYearHrs > 500) insight = "Great habit. Noticeable life improvement.";
              else insight = "A nice little compounding habit.";

              return (
                <div key={act.id} className="bg-gray-900/50 backdrop-blur rounded-lg p-4 border" style={{ borderColor: `${color}40` }}>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-bold text-gray-100">{act.name}</span>
                  </div>
                  <div className="text-2xl font-black text-white mb-1">
                    {fiveYearHrs.toLocaleString()} <span className="text-sm font-normal text-gray-400">hours</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-3">{yearlyHrs} hrs / year</div>
                  <div className="text-sm font-medium text-indigo-300 bg-indigo-900/30 p-2 rounded">
                    "{insight}"
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  };

  const renderSetup = () => {
    const addActivity = (e) => {
      e.preventDefault();
      const form = e.target;
      const name = form.name.value;
      const code = form.code.value.substring(0, 3).toUpperCase();
      const categoryId = form.categoryId.value;
      
      if (!name || !code || !categoryId) return;
      
      const newAct = { id: `a${Date.now()}`, name, code, categoryId };
      setActivities([...activities, newAct]);
      form.reset();
    };

    const addCategory = (e) => {
      e.preventDefault();
      const form = e.target;
      const name = form.catName.value;
      const color = newCatColor;
      
      if (!name) return;
      
      const newCat = { id: `c${Date.now()}`, name, color };
      setCategories([...categories, newCat]);
      form.reset();
    };

    const deleteActivity = (id) => {
      setActivities(activities.filter(a => a.id !== id));
      // Cleanup schedule
      const newSchedule = { ...schedule };
      Object.keys(newSchedule).forEach(k => {
        if (newSchedule[k] === id) delete newSchedule[k];
      });
      setSchedule(newSchedule);
      if (selectedActivityId === id) setSelectedActivityId(null);
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activities Setup */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-6">Manage Activities</h3>
          
          <form onSubmit={addActivity} className="bg-gray-900 p-4 rounded-lg border border-gray-700 mb-6 flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-gray-400">Add New Activity</h4>
            <div className="grid grid-cols-2 gap-3">
              <input name="name" type="text" placeholder="Activity Name (e.g. Yoga)" className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" required />
              <input name="code" type="text" placeholder="Code (e.g. YG)" maxLength={3} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" required />
              <select name="categoryId" className="col-span-2 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" required>
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded flex items-center justify-center transition-colors">
              <Plus size={16} className="mr-1"/> Add Activity
            </button>
          </form>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {activities.map(act => {
              const cat = categories.find(c => c.id === act.categoryId);
              return (
                <div key={act.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded border border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: cat ? cat.color : '#fff' }} />
                    <div>
                      <div className="text-sm font-bold text-white">{act.name} <span className="text-gray-400 font-normal ml-1">({act.code})</span></div>
                      <div className="text-xs text-gray-400">{cat ? cat.name : 'Unknown'}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteActivity(act.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories Setup */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-6">Manage Categories</h3>
          
          <form onSubmit={addCategory} className="bg-gray-900 p-4 rounded-lg border border-gray-700 mb-6 flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-gray-400">Add New Category</h4>
            <div className="flex flex-col gap-3">
              <input name="catName" type="text" placeholder="Category Name" className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" required />
              <div className="flex flex-wrap gap-2 pt-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${newCatColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : 'opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                    title="Select color"
                  />
                ))}
              </div>
            </div>
            <button type="submit" className="mt-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 rounded flex items-center justify-center transition-colors">
              <Plus size={16} className="mr-1"/> Add Category
            </button>
          </form>

          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center space-x-3 bg-gray-700/50 p-3 rounded border border-gray-600">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                <div className="text-sm font-medium text-white">{cat.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              ChronoCompound
            </h1>
            <p className="text-gray-400 text-sm mt-1">Design your ideal week. Compound your future.</p>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'grid' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <GridIcon size={18} className="mr-2" /> Planner
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'insights' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 size={18} className="mr-2" /> Insights
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'setup' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Settings size={18} className="mr-2" /> Legend
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-h-[600px]">
          {activeTab === 'grid' && renderGrid()}
          {activeTab === 'insights' && renderInsights()}
          {activeTab === 'setup' && renderSetup()}
        </main>
        
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}} />
    </div>
  );
}