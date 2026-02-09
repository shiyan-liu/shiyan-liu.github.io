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

<div id="lightbox" onclick="this.style.display='none'">
  <img id="lightbox-img" src="">
</div>

<span class='anchor' id='trips'></span>

# Trips --- He that travels far knows much!

(Coming very soon!)

## 🇨🇳 China

### Wuhan
<div class="scroll-container">
  <img src="images/500x300.png" onclick="zoom(this)">
  <img src="images/500x300.png" onclick="zoom(this)">
  <img src="images/500x300.png" onclick="zoom(this)">
  <img src="images/500x300.png" onclick="zoom(this)">
  <img src="images/500x300.png" onclick="zoom(this)">
  <img src="images/500x300.png" onclick="zoom(this)">
</div>

### Beijing

---

## 🇪🇸 Spain

### Madrid

### Bilbao

### Barcelona

---

## 🇰🇷 Korea

### Seoul

### Gangneung

---

## 🇯🇵 Japan

### Tokyo

---

## 🇺🇸 U.S.

### Los Angeles

### San Francisco

### Berkeley

<script>
function zoom(el) {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  
  lbImg.src = el.src;
  
  // 设置宽度为原图原始物理尺寸的 2 倍
  lbImg.style.width = (el.naturalWidth * 2) + 'px';
  lbImg.style.height = 'auto'; // 保持比例
  
  lb.style.display = 'flex';
}
</script>