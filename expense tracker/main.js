// main.js
// Enhanced dynamic motion effects for the dashboard with error handling

// Utility functions
const showError = (message, duration = 5000) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #e53e3e;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: Arial, sans-serif;
    max-width: 300px;
    word-wrap: break-word;
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.style.opacity = '0';
    errorDiv.style.transition = 'opacity 0.5s ease';
    setTimeout(() => errorDiv.remove(), 500);
  }, duration);
};

const showSuccess = (message, duration = 3000) => {
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #38a169;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: Arial, sans-serif;
    max-width: 300px;
    word-wrap: break-word;
  `;
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.style.opacity = '0';
    successDiv.style.transition = 'opacity 0.5s ease';
    setTimeout(() => successDiv.remove(), 500);
  }, duration);
};

// Check authentication status
const checkAuth = async () => {
  try {
    const response = await fetch('/api/expenses');
    if (response.status === 401) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
};

// Safe fetch wrapper with error handling
const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 401) {
      window.location.href = '/login.html';
      throw new Error('Authentication required');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    if (error.message === 'Authentication required') {
      throw error;
    }
    console.error(`Fetch error for ${url}:`, error);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication first
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    return;
  }

  // Fade-in animation for cards
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 150 * index);
  });

  // Add click ripple effect to cards
  cards.forEach(card => {
    card.addEventListener('click', function(e) {
      // Don't create ripple if clicking on links or form elements
      if (e.target.tagName === 'A' || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  // Animate expense bar on load
  const expenseBar = document.querySelector('.expenses-bar-fill');
  if (expenseBar) {
    setTimeout(() => {
      expenseBar.style.width = '90%';
    }, 1000);
  }

  // Add hover sound effect (optional)
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px) scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0) scale(1)';
    });
  });

  // Fetch and update expenses on dashboard with error handling
  try {
    const response = await safeFetch('/api/expenses');
    const data = await response.json();
    
    // Update the amount
    const amountDiv = document.querySelector('.expenses-amount');
    if (amountDiv && data.currentSpent !== undefined) {
      amountDiv.textContent = `₹${data.currentSpent.toFixed(2)}`;
    }
    
    // Update the bar
    const bar = document.querySelector('.expenses-bar-fill');
    if (bar && data.currentSpent !== undefined && data.monthlyBudget) {
      const percent = Math.min(100, (data.currentSpent / data.monthlyBudget) * 100);
      bar.style.width = percent + '%';
      
      // Change color based on spending
      if (percent >= 90) {
        bar.style.background = '#e53e3e'; // Red for high spending
      } else if (percent >= 70) {
        bar.style.background = '#dd6b20'; // Orange for moderate spending
      } else {
        bar.style.background = '#3b82f6'; // Blue for normal spending
      }
    }
    
    // Update the labels
    const labels = document.querySelectorAll('.expenses-labels span');
    if (labels.length === 2 && data.monthlyBudget) {
      labels[1].textContent = `₹${data.monthlyBudget}`;
    }
  } catch (err) {
    console.error('Failed to load expenses:', err);
    showError('Failed to load expenses data');
  }

  // Fetch and update daily routine on dashboard with error handling
  try {
    const response = await safeFetch('/api/routines');
    const data = await response.json();
    
    const routineList = document.querySelector('.routine-list');
    if (routineList && Array.isArray(data.routines)) {
      if (data.routines.length === 0) {
        routineList.innerHTML = '<li style="color: #718096; font-style: italic;">No routines added yet</li>';
      } else {
        routineList.innerHTML = data.routines.slice(0, 3).map(routine =>
          `<li><input type="checkbox" ${routine.completed ? 'checked' : ''} disabled> ${routine.task}${routine.time ? ' at ' + routine.time : ''}</li>`
        ).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load routines:', err);
    showError('Failed to load routine data');
  }

  // Fetch and update quick notes on dashboard with error handling
  try {
    const response = await safeFetch('/api/notes');
    const data = await response.json();
    
    const notesTextarea = document.querySelector('.card textarea');
    if (notesTextarea && Array.isArray(data.notes) && data.notes.length > 0) {
      notesTextarea.value = data.notes[data.notes.length - 1].content;
    }
  } catch (err) {
    console.error('Failed to load notes:', err);
    showError('Failed to load notes data');
  }

  // Fetch and update to-do list on dashboard with error handling
  try {
    const response = await safeFetch('/api/todos');
    const data = await response.json();
    
    const todoList = document.querySelector('.todo-list');
    if (todoList && Array.isArray(data.todos)) {
      if (data.todos.length === 0) {
        todoList.innerHTML = '<li style="color: #718096; font-style: italic;">No tasks added yet</li>';
      } else {
        todoList.innerHTML = data.todos.slice(0, 3).map(todo =>
          `<li><input type="checkbox" ${todo.completed ? 'checked' : ''} disabled> ${todo.task}</li>`
        ).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load todos:', err);
    showError('Failed to load todo data');
  }

  // Fetch and update split bills on dashboard with error handling
  try {
    const response = await safeFetch('/api/bills');
    const data = await response.json();
    
    const billCard = document.querySelector('.card a[href="split-bills.html"]');
    if (billCard && Array.isArray(data.bills) && data.bills.length > 0) {
      const billCardElement = billCard.closest('.card');
      if (billCardElement) {
        const latestBill = data.bills[data.bills.length - 1];
        let billInfo = `<div style='margin-top:10px;'><strong>${latestBill.description}</strong><br>Total: ₹${latestBill.totalAmount}<br>Split: ₹${latestBill.amountPerPerson.toFixed(2)} each</div>`;
        
        // Hide the form
        const form = billCardElement.querySelector('form');
        if (form) form.style.display = 'none';
        
        // Show bill info
        let infoDiv = billCardElement.querySelector('.split-bill-info');
        if (!infoDiv) {
          infoDiv = document.createElement('div');
          infoDiv.className = 'split-bill-info';
          billCardElement.appendChild(infoDiv);
        }
        infoDiv.innerHTML = billInfo;
      }
    }
  } catch (err) {
    console.error('Failed to load bills:', err);
    showError('Failed to load bill data');
  }

  // Fetch and update meal planner on dashboard with error handling
  try {
    const response = await safeFetch('/api/meals');
    const data = await response.json();
    
    const mealCard = document.querySelector('.card a[href="meal-planner.html"]');
    if (mealCard && data.weeklyMeals) {
      const mealCardElement = mealCard.closest('.card');
      if (mealCardElement) {
        let summary = Object.entries(data.weeklyMeals).map(([day, meals]) => {
          let mealStr = Object.values(meals).filter(Boolean).join(', ');
          return mealStr ? `<div><strong>${day}:</strong> ${mealStr}</div>` : '';
        }).filter(Boolean).join('');
        
        if (!summary) summary = '<div style="color: #718096; font-style: italic;">No meals planned yet</div>';
        
        let infoDiv = mealCardElement.querySelector('.meal-planner-info');
        if (!infoDiv) {
          infoDiv = document.createElement('div');
          infoDiv.className = 'meal-planner-info';
          mealCardElement.appendChild(infoDiv);
        }
        infoDiv.innerHTML = summary;
      }
    }
  } catch (err) {
    console.error('Failed to load meals:', err);
    showError('Failed to load meal data');
  }

  // Fetch and update weather on dashboard with error handling
  const weatherCard = document.querySelector('.card a[href="weather.html"]');
  if (weatherCard) {
    const weatherCardElement = weatherCard.closest('.card');
    if (weatherCardElement) {
      const API_KEY = "5f56d525d1619d0a2cd2eac4ce55588e";
      const city = 'Bengaluru';
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
      
      const iconDiv = weatherCardElement.querySelector('div[style*="font-size: 40px;"]');
      const tempDiv = weatherCardElement.querySelector('.weather-temp');
      const locDiv = weatherCardElement.querySelector('.weather-location');
      
      if (iconDiv && tempDiv && locDiv) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
          }
          
          const data = await response.json();
          if (data && data.main && data.weather) {
            const temp = Math.round(data.main.temp);
            const icon = data.weather[0].icon;
            const description = data.weather[0].main;
            const weatherIcon = `<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" style="vertical-align:middle;width:48px;height:48px;">`;
            
            iconDiv.innerHTML = weatherIcon;
            tempDiv.innerHTML = temp + '&deg;C';
            locDiv.textContent = city;
            console.log('Weather updated:', temp, description);
          } else {
            throw new Error('Weather data missing fields');
          }
        } catch (err) {
          console.error('Failed to load weather:', err);
          iconDiv.textContent = '⛅';
          tempDiv.textContent = '--';
          locDiv.textContent = city;
          
          // Show error message
          const errorMsg = weatherCardElement.querySelector('.weather-error');
          if (!errorMsg) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'weather-error';
            errorDiv.style.cssText = 'color: #e53e3e; font-size: 12px; margin-top: 5px;';
            errorDiv.textContent = 'Weather unavailable';
            weatherCardElement.appendChild(errorDiv);
          }
        }
      }
    }
  }

  // Add logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
          showSuccess('Logged out successfully');
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 1000);
        } else {
          throw new Error('Logout failed');
        }
      } catch (err) {
        console.error('Logout error:', err);
        showError('Logout failed. Please try again.');
      }
    });
  }
});

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
  .card {
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }
  
  .card a, .card input, .card button, .card textarea {
    cursor: pointer;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(102, 126, 234, 0.3);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
  }
  
  .expenses-bar-fill {
    transition: width 1s ease, background-color 0.5s ease;
  }
  
  .weather-error {
    animation: fadeIn 0.5s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;
document.head.appendChild(style); 