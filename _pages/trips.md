---
permalink: /trips
title: ""
excerpt: ""
author_profile: true
redirect_from: 
---

<style>
  /* 强制横向滚动容器 */
  .scroll-container {
    display: flex;
    overflow-x: scroll;
    overflow-y: hidden;
    gap: 15px;
    padding: 10px 0;
    scroll-snap-type: x mandatory;
  }

  /* 美化滚动条 */
  .scroll-container::-webkit-scrollbar {
    height: 5px;
  }
  .scroll-container::-webkit-scrollbar-thumb {
    background: #eaeaea;
    border-radius: 10px;
  }

  /* 图片设置 */
  .scroll-container img {
    height: 200px;
    flex: 0 0 auto;
    scroll-snap-align: start;
    object-fit: cover;
    border-radius: 8px;
    cursor: zoom-in; /* 增加放大手型指示 */
  }

  /* 点击放大专用样式 */
    #lightbox {
    display: none; 
    position: fixed; 
    z-index: 9999; 
    top: 0; left: 0; 
    width: 100%; height: 100%; 
    align-items: center; 
    justify-content: center; 
    cursor: zoom-out;
    }

    #lightbox img { 
    border-radius: 4px; 
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
    }
</style>

<style>
  /* 城市卡片容器 */
  .city-card {
    flex: 0 0 auto; /* 关键：确保卡片不会被压缩 */
    scroll-snap-align: start;
    position: relative;
    transition: transform 0.2s;
  }
  
  /* 覆盖原有CSS的 zoom-in，第一级封面应该是点击进入的手型 */
  .city-card img {
    cursor: pointer !important;
  }

  .city-card:hover {
    transform: translateY(-3px);
  }

  /* 城市名称遮罩 */
  .city-name-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
    color: white;
    padding: 10px;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    font-weight: bold;
    pointer-events: none;
  }

  /* 二级页面容器 */
  #level-2-view {
    display: none;
    animation: fadeIn 0.3s ease-in-out;
  }

  /* 导航栏 - 去掉了底部的 border-bottom */
  .nav-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    /* border-bottom: 1px solid #eee;  <-- 已移除 */
  }
  
  .back-btn {
    cursor: pointer;
    padding: 8px 16px;
    background-color: #f0f0f0;
    border-radius: 20px;
    margin-right: 15px;
    font-size: 14px;
    border: none;
    transition: background 0.2s;
  }
  .back-btn:hover {
    background-color: #e0e0e0;
  }

  /* 瀑布流布局 */
  .waterfall-container {
    column-count: 3;
    column-gap: 15px;
  }
  
  @media (max-width: 768px) {
    .waterfall-container {
      column-count: 2;
    }
  }

  .waterfall-item {
    break-inside: avoid;
    margin-bottom: 15px;
  }
  
  /* 瀑布流里的图片保持 zoom-in */
  .waterfall-item img {
    width: 100%;
    height: auto;
    border-radius: 8px;
    cursor: zoom-in; 
    display: block;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>

<div id="lightbox" onclick="this.style.display='none'">
  <img id="lightbox-img" src="">
</div>

<span class='anchor' id='trips'></span>

# Trips --- He that travels far knows much!

<div id="level-1-view"></div>

<div id="level-2-view">
  <div class="nav-header">
    <button class="back-btn" onclick="showLevel1()">← Back to List</button>
    <h2 id="detail-city-title" style="margin: 0;">City Name</h2>
  </div>
  <div id="waterfall-content" class="waterfall-container"></div>
</div>

<script>
// --- [配置区域] 所有图片统一使用 images/500x300.png ---
const TRIP_CONFIG = [
  {
    country: "🇨🇳 China",
    cities: [
      {
        name: "Wuhan",
        cover: "images/500x300.png",
        photos: [
          "images/500x300.png", 
          "images/500x300.png",
          "images/500x300.png", 
          "images/500x300.png"
        ]
      },
      {
        name: "Beijing",
        cover: "images/500x300.png",
        photos: ["images/500x300.png", "images/500x300.png"]
      }
    ]
  },
  {
    country: "🇪🇸 Spain",
    cities: [
      {
        name: "Barcelona",
        cover: "images/500x300.png",
        photos: ["images/500x300.png", "images/500x300.png", "images/500x300.png"]
      },
      {
        name: "Madrid",
        cover: "images/500x300.png",
        photos: []
      }
    ]
  },
  {
    country: "🇺🇸 U.S.",
    cities: [
      {
        name: "Berkeley",
        cover: "images/500x300.png",
        photos: ["images/500x300.png"]
      },
      {
        name: "San Francisco",
        cover: "images/500x300.png",
        photos: ["images/500x300.png", "images/500x300.png"]
      }
    ]
  }
];

// --- [功能逻辑] ---

function renderLevel1() {
  const container = document.getElementById('level-1-view');
  let html = '';

  TRIP_CONFIG.forEach((countryData, countryIndex) => {
    html += `<h2>${countryData.country}</h2>`;
    html += `<div class="scroll-container">`; // 这一层是 Flex 容器
    
    countryData.cities.forEach((city, cityIndex) => {
      // 这一层是 Flex Item (flex: 0 0 auto)
      html += `
        <div class="city-card" onclick="showLevel2(${countryIndex}, ${cityIndex})">
          <img src="${city.cover}" alt="${city.name}">
          <div class="city-name-overlay">${city.name}</div>
        </div>
      `;
    });
    
    html += `</div><hr>`; 
  });

  container.innerHTML = html;
}

function showLevel2(countryIdx, cityIdx) {
  const data = TRIP_CONFIG[countryIdx].cities[cityIdx];
  document.getElementById('detail-city-title').innerText = data.name;
  
  const grid = document.getElementById('waterfall-content');
  let photosHtml = '';
  
  if (data.photos && data.photos.length > 0) {
    data.photos.forEach(src => {
      photosHtml += `
        <div class="waterfall-item">
          <img src="${src}" onclick="zoom(this)">
        </div>
      `;
    });
  } else {
    photosHtml = '<p>No photos yet.</p>';
  }
  
  grid.innerHTML = photosHtml;
  document.getElementById('level-1-view').style.display = 'none';
  document.getElementById('level-2-view').style.display = 'block';
  window.scrollTo(0, 0);
}

function showLevel1() {
  document.getElementById('level-2-view').style.display = 'none';
  document.getElementById('level-1-view').style.display = 'block';
}

// 复用原有的 Zoom 函数
function zoom(el) {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  lbImg.src = el.src;
  lbImg.style.width = (el.naturalWidth * 2) + 'px';
  lbImg.style.height = 'auto'; 
  lb.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', renderLevel1);
</script>