---
permalink: /
title: ""
excerpt: ""
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

{% if site.google_scholar_stats_use_cdn %}
{% assign gsDataBaseUrl = "https://cdn.jsdelivr.net/gh/" | append: site.repository | append: "@" %}
{% else %}
{% assign gsDataBaseUrl = "https://raw.githubusercontent.com/" | append: site.repository | append: "/" %}
{% endif %}
{% assign url = gsDataBaseUrl | append: "google-scholar-stats/gs_data_shieldsio.json" %}

<span class='anchor' id='about-me'></span>

> Last update: {{ site.time | date: "%Y-%m-%d" }}

Hi there! I'm **Shiyan Liu (刘师言)**, a recent BEng graduate in Data Science & Big Data Technology from Huazhong University of Science and Technology (HUST). I spent a wonderful Spring 2026 semester at UC Berkeley as a visiting student, and I'm now heading to Imperial College London for an MSc in Computing (AI&ML) in Fall 2026. I also had a fulfilling internship at JD.com in 2025, and am glad to be back there this summer as a Machine Learning Engineer.

My research interests include machine learning, deep learning, reinforcement learning, and data science. My prior reseach experiences focused on deep reinforcement learning and agentic AI systems. I look forward to collaborating with fellow researchers and contributing to the frontiers of AI. None of this would have been possible without the people who believed in me along the way. [→ Acknowledgements](/acknowledgements)

Outside of research, I love playing football and have proudly been a devoted Tottenham Hotspur supporter since 2018. Come on you Spurs! 🤍⚽️

<style>
@media (max-width:600px) {
  .ri-box { display:block !important; overflow-x:hidden !important; }
  .ri-box td { white-space:normal !important; }
}
</style>
<div class="ri-box" style="display:inline-block;background:#eaf3fb;border-radius:5px;padding:7px 12px 1px;margin:14px 0;max-width:100%;overflow-x:auto">
  <div style="font-weight:700;color:#1a6fa8;font-size:0.88em;margin-bottom:2px">🔬 Research Interests &nbsp;<span style="font-weight:normal;font-style:italic;color:#333">Finding the right answer — and knowing it's right — across graphs, documents, and language.</span></div>
  <table style="border:none;border-collapse:collapse">
    <tr>
      <td style="border:none;padding:1px 8px 1px 0;vertical-align:top;white-space:nowrap;font-weight:600;font-size:0.86em;color:#333">Neural Combinatorial Optimization</td>
      <td style="border:none;padding:1px 0;font-size:0.86em;color:#555;white-space:nowrap">Geometric equivariance: <a href="https://arxiv.org/abs/2606.01084">MViewRouter</a> &nbsp;·&nbsp; Multimodal fusion: <a href="https://arxiv.org/abs/2508.01774">VAGPO</a></td>
    </tr>
    <tr>
      <td style="border:none;padding:1px 8px 1px 0;vertical-align:top;white-space:nowrap;font-weight:600;font-size:0.86em;color:#333">Dense Retrieval</td>
      <td style="border:none;padding:1px 0;font-size:0.86em;color:#555;white-space:nowrap">Positive-unlabeled: <a href="https://drive.google.com/file/d/1GZQx-IsRWwkPur0ifNjz3rAgbdC_rHZa/view?usp=sharing">PURE</a> &nbsp;·&nbsp; Test-time adaptation: <a href="https://arxiv.org/abs/2606.01070">DART</a></td>
    </tr>
    <tr>
      <td style="border:none;padding:1px 8px 1px 0;vertical-align:top;white-space:nowrap;font-weight:600;font-size:0.86em;color:#333">Trustworthy LLM Systems</td>
      <td style="border:none;padding:1px 0;font-size:0.86em;color:#555;white-space:nowrap">Probabilistic evaluation: <a href="https://arxiv.org/abs/2512.22629">DICE</a> &nbsp;·&nbsp; Explainable optimization: <a href="https://arxiv.org/abs/2603.18388">VISTA</a></td>
    </tr>
  </table>
</div>

<span style="display:inline-block;background:#fff0f0;color:#c0392b;border:1px solid #f5c6c6;border-radius:4px;padding:4px 10px;font-size:0.95em">I am currently and actively looking for <strong>(Volunteer) Research Assistant</strong> opportunities, and would greatly appreciate any leads.<br>Please feel free to reach me at <a href="mailto:shyl@hust.edu.cn" style="color:#c0392b">shyl@hust.edu.cn</a> (institutional) or <a href="mailto:shyliu.china@gmail.com" style="color:#c0392b">shyliu.china@gmail.com</a> (personal).</span>

# 📖 Educations

<div style="display:flex;align-items:center;margin:10px 0">
  <img src="/images/icons/imperial-icon.png" style="height:36px;width:36px;object-fit:contain;margin-right:12px;flex-shrink:0;">
  <div>
    <strong>Imperial College London</strong> <span style="color:red;margin-left:4px"><em>Prospective</em></span><br>
    <span style="color:#555">MSc Computing (AI&ML)</span> <span style="color:#888">· 2026.09 - 2027.12</span> <span style="color:#bbb">· London, UK</span>
  </div>
</div>

<div style="display:flex;align-items:center;margin:10px 0">
  <img src="/images/icons/berkeley-icon.png" style="height:36px;width:36px;object-fit:contain;margin-right:12px;flex-shrink:0;">
  <div>
    <strong>UC Berkeley</strong><br>
    <span style="color:#555">Visiting Student</span> <span style="color:#888">· 2026.01 - 2026.05</span> <span style="color:#bbb">· Berkeley, CA, USA</span>
  </div>
</div>

<div style="display:flex;align-items:center;margin:10px 0">
  <img src="/images/icons/hust-icon.png" style="height:36px;width:36px;object-fit:contain;margin-right:12px;flex-shrink:0;">
  <div>
    <strong>Huazhong University of Science and Technology (HUST)</strong><br>
    <span style="color:#555">BEng Data Science & Big Data Technology</span> <span style="color:#888">· 2022.09 - 2026.06</span> <span style="color:#bbb">· Wuhan, China</span>
  </div>
</div>


# 💻 Internships

<div style="display:flex;align-items:center;margin:10px 0">
  <img src="/images/icons/jd-icon.svg" style="height:36px;width:36px;object-fit:contain;margin-right:12px;flex-shrink:0;">
  <div>
    <strong>JD.com</strong> <span style="color:red;margin-left:4px"><em>Ongoing</em></span><br>
    <span style="color:#555">Machine Learning Engineer</span> <span style="color:#888">· 2026.06 - now</span> <span style="color:#bbb">· Beijing, China</span>
  </div>
</div>

<div style="display:flex;align-items:center;margin:10px 0">
  <img src="/images/icons/hust-icon.png" style="height:36px;width:36px;object-fit:contain;margin-right:12px;flex-shrink:0;">
  <div>
    <strong>Reinforcement Learning & Intelligent Computing Group, HUST</strong><br>
    <span style="color:#555">Research Assistant · Fortunately advised by <a href="https://scholar.google.com/citations?user=joz7edsAAAAJ">Prof. Yan Jin</a></span> <span style="color:#888">· 2024.06 - now</span> <span style="color:#bbb">· Wuhan, China</span>
  </div>
</div>

<div style="display:flex;align-items:center;margin:10px 0">
  <img src="/images/icons/jd-icon.svg" style="height:36px;width:36px;object-fit:contain;margin-right:12px;flex-shrink:0;">
  <div>
    <strong>JD.com</strong><br>
    <span style="color:#555">Software Development Engineer</span> <span style="color:#888">· 2025.03 - 2025.08</span> <span style="color:#bbb">· Beijing, China</span>
  </div>
</div>

# 📝 Publications & Preprints

- [2026.04] **<u>Liu, S.</u>**, Li, Y. **Test-Time Training for Zero-Resource Dense Retrieval Reranking**. <span style="background:#e8f5e9;color:#2e7d32;border-radius:3px;padding:1px 6px;font-size:0.88em">Accepted @ KnowFM · ACL 2026</span> [[paper](https://arxiv.org/abs/2606.01070)]
- [2026.04] **<u>Liu, S.</u>**, Xia, Q., Xia, Q., Liu, Y., Yu, X. & Qu, R. **Reflection in the Dark: Exposing and Escaping the Black Box in Reflective Prompt Optimization**. <span style="background:#e8f5e9;color:#2e7d32;border-radius:3px;padding:1px 6px;font-size:0.88em">Accepted @ ACL 2026 SRW</span> [[paper](https://arxiv.org/abs/2603.18388)] [![citations](https://img.shields.io/badge/citations-1-blue)](https://scholar.google.com/scholar?q=Reflection+in+the+Dark+Exposing+and+Escaping+the+Black+Box+in+Reflective+Prompt+Optimization)
- [2026] **<u>Liu, S.</u>**, Tan, B., Wu, Y., & Jin, Y. **MViewRouter: Internalizing Geometric Equivariance via Multi-view Alternating Attention for Combinatorial Routing**. <span style="background:#f5f5f5;color:#777;border-radius:3px;padding:1px 6px;font-size:0.88em">Under Review</span> [[paper](https://arxiv.org/abs/2606.01084)]
- [2025.11] **<u>Liu, S.</u>**, Ma, J., & Qu, R. **DICE: Discrete Interpretable Comparative Evaluation with Probabilistic Scoring for Retrieval-Augmented Generation**. <span style="background:#e8f5e9;color:#2e7d32;border-radius:3px;padding:1px 6px;font-size:0.88em">Accepted @ ResponsibleFM · NeurIPS 2025</span> [[paper](https://arxiv.org/abs/2512.22629)] [[code](https://github.com/shiyan-liu/DICE)] [![citations](https://img.shields.io/badge/citations-1-blue)](https://scholar.google.com/scholar?q=DICE+Discrete+Interpretable+Comparative+Evaluation+Probabilistic+Scoring+Retrieval-Augmented+Generation)
- [2025] **<u>Liu, S.</u>**, Tan, B., Cao, Z., & Jin, Y. **VAGPO: Vision-augmented Asymmetric Group Preference Optimization for Graph Routing Problems**. <span style="background:#f5f5f5;color:#777;border-radius:3px;padding:1px 6px;font-size:0.88em">Under Review</span> [[paper](https://arxiv.org/abs/2508.01774)] [![citations](https://img.shields.io/badge/citations-1-blue)](https://scholar.google.com/scholar?q=VAGPO+Vision-augmented+Asymmetric+Group+Preference+Optimization+for+Graph+Routing+Problems)
- [2025] **<u>Liu, S.</u>**, Qu, R., & Jin, Y. **FluentLip: A Phonemes-Based Two-stage Approach for Audio-Driven Lip Synthesis with Optical Flow Consistency**. <span style="background:#f5f5f5;color:#777;border-radius:3px;padding:1px 6px;font-size:0.88em">arXiv Preprint</span> [[paper](https://arxiv.org/abs/2504.04427)]

# 🎖 Honors and Awards
- *2026.04* Outstanding Graduate (HUST).
- *2025.09* National Scholarship. 
- *2025.09* Outstanding Student Scholarship (HUST).
- *2025.05* Tencent Scholarship.
- *2024.09* Academic Excellence Scholarship (HUST).