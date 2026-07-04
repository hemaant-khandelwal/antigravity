// --- Preloader — Command Center Boot ---
(function initPreloader() {
    const preloader = document.getElementById('preloader');
    const bar = document.getElementById('preloader-bar');
    const logEl = document.getElementById('preloader-log');
    const welcomeEl = document.getElementById('preloader-welcome');
    const secStatus = document.getElementById('preloader-sec-status');
    if (!preloader || !bar || !logEl) return;

    const startTime = Date.now();
    const MIN_DISPLAY = 2200;
    const TOTAL_DURATION = 2600;
    let pageLoaded = false;
    let done = false;

    const milestones = [
        { pct: 15, text: 'ESTABLISHING BRIDGE...' },
        { pct: 40, text: 'AUTHENTICATING PROTOCOLS...' },
        { pct: 65, text: 'SYNCHRONIZING SYSTEMS...' },
        { pct: 85, text: 'SECURING CHANNEL...' },
        { pct: 100, text: 'COMMAND CENTER ACTIVE' },
    ];
    let milestoneIdx = 0;

    function tryDismiss() {
        if (done) return;
        const elapsed = Date.now() - startTime;
        if (pageLoaded && elapsed >= MIN_DISPLAY && bar.style.width === '100%') {
            done = true;
            logEl.textContent = 'COMMAND CENTER ACTIVE';
            logEl.style.color = 'var(--accent)';
            if (secStatus) {
                secStatus.className = secStatus.className.replace('text-warning/60', 'text-success/80');
                const dot = secStatus.querySelector('span');
                if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(0,255,148,0.6)]';
            }
            // Show welcome message
            if (welcomeEl) {
                welcomeEl.classList.remove('hidden');
                welcomeEl.style.animation = 'fadeInUp 0.5s ease forwards';
            }
            // Hold, then hide all elements leaving only the glass
            setTimeout(() => {
                // Hide all inner elements
                const inner = preloader.querySelector('.relative.z-10');
                if (inner) {
                    inner.style.opacity = '0';
                    inner.style.transition = 'opacity 0.4s ease';
                }
                // Then fade out preloader entirely
                setTimeout(() => {
                    preloader.style.opacity = '0';
                    preloader.style.transition = 'opacity 0.5s ease';
                    setTimeout(() => { if (preloader.parentNode) preloader.remove(); if (window.playSignatureAnimation) window.playSignatureAnimation(); }, 600);
                }, 500);
            }, 1200);
        }
    }

    function animateBar() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
        bar.style.width = progress + '%';

        while (milestoneIdx < milestones.length && progress >= milestones[milestoneIdx].pct) {
            logEl.textContent = milestones[milestoneIdx].text;
            milestoneIdx++;
        }

        if (progress < 100) {
            requestAnimationFrame(animateBar);
        } else {
            tryDismiss();
        }
    }

    requestAnimationFrame(animateBar);

    function onPageLoad() {
        pageLoaded = true;
        tryDismiss();
    }

    if (document.readyState === 'complete') {
        onPageLoad();
    } else {
        window.addEventListener('load', onPageLoad);
    }
})();

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    // 2. Setup GSAP ScrollTrigger + Lenis (single RAF via gsap.ticker only)
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop(value) {
            if (arguments.length) {
                lenis.scrollTo(value, { immediate: true });
            }
            return lenis.scroll;
        },
        getBoundingClientRect() {
            return {
                top: 0,
                left: 0,
                width: window.innerWidth,
                height: window.innerHeight,
            };
        },
    });

    ScrollTrigger.defaults({ scroller: document.documentElement });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.addEventListener('refresh', () => lenis.resize());
    ScrollTrigger.refresh();

    // Signature background removal + draw reveal animation
    const sigImg = document.querySelector('.signature-img');
    if (sigImg) {
        const sigSource = typeof sigBase64 !== 'undefined' ? sigBase64 : 'signature.png';
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.src = sigSource;

        tempImg.onload = () => {
            const sigCanvas = document.createElement('canvas');
            sigCanvas.width = tempImg.width;
            sigCanvas.height = tempImg.height;
            const sigCtx = sigCanvas.getContext('2d');
            sigCtx.drawImage(tempImg, 0, 0);

            try {
                const imageData = sigCtx.getImageData(0, 0, sigCanvas.width, sigCanvas.height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    data[i] = 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                    data[i + 3] = brightness < 180 ? 255 : 0;
                }

                sigCtx.putImageData(imageData, 0, 0);
                sigImg.src = sigCanvas.toDataURL('image/png');
            } catch (error) {
                console.warn('Signature canvas processing failed, using source image.', error);
            }

            window.playSignatureAnimation = () => { gsap.to(sigImg, { clipPath: 'inset(0 0% 0 0)', duration: 2.5, ease: 'power2.inOut', delay: 0.1 }); };
        };

        tempImg.onerror = () => {
            window.playSignatureAnimation = () => { gsap.to(sigImg, { clipPath: 'inset(0 0% 0 0)', duration: 2.5, ease: 'power2.inOut', delay: 0.1 }); };
        };
    }

    // Signature stays visible through entire hero sequence, fades only after it ends
    const sigContainer = document.querySelector('.signature-img')?.parentElement;
    if (sigContainer) {
        gsap.set(sigContainer, { opacity: 1, y: 0 });
        gsap.to(sigContainer, {
            opacity: 0,
            y: -20,
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'bottom-=400 top',
                end: 'bottom top',
                scrub: true,
            },
        });
    }

    // Scroll indicator — fixed at viewport bottom, fades on scroll, clickable skip
    const scrollIndicator = document.getElementById('scroll-indicator');
    if (scrollIndicator) {
        gsap.set(scrollIndicator, { opacity: 1, y: 0 });
        gsap.to(scrollIndicator, {
            opacity: 0,
            y: 20,
            pointerEvents: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: '+=400',
                scrub: true,
            },
        });

        scrollIndicator.addEventListener('click', () => {
            const hero = document.getElementById('hero');
            if (!hero) return;
            const heroBottom = hero.offsetTop + hero.offsetHeight;
            lenis.scrollTo(heroBottom, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) });
        });
    }

    // 3. Canvas Image Sequence Setup
    const canvas = document.getElementById("sequence-canvas");
    const context = canvas.getContext("2d");
    
    // Set Canvas Size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        renderFrame(scene.frame); // Re-render current frame on resize
    }
    window.addEventListener('resize', resizeCanvas);
    
    const frameCount = 150;
    const currentFrame = index => `./sequence/frame_${index.toString().padStart(3, '0')}_delay-0.066s.png`;
    
    const images = [];
    const scene = {
        frame: 0
    };

    // Preload images
    let imagesLoaded = 0;
    for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        img.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === 1) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                renderFrame(0);
            }
            if (imagesLoaded === frameCount) {
                ScrollTrigger.refresh();
            }
        };
        images.push(img);
    }

    // Render Frame Function (Object-fit: cover equivalent)
    function renderFrame(index) {
        if (!images[index] || !images[index].complete) return;
        
        const img = images[index];
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasRatio > imgRatio) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / imgRatio;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            drawWidth = canvas.height * imgRatio;
            drawHeight = canvas.height;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
        }
        
        context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    // 4. Hero Scrollytelling Animation
    const heroSection = document.getElementById("hero");
    
    // Canvas Scroll Animation
    gsap.to(scene, {
        frame: frameCount - 1,
        snap: 'frame',
        ease: 'none',
        scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
            invalidateOnRefresh: true,
        },
        onUpdate: () => renderFrame(Math.round(scene.frame)),
    });

    // Story Overlays Animation
    const story1 = document.getElementById("story-1");
    const story2 = document.getElementById("story-2");
    const story3 = document.getElementById("story-3");
    const story4 = document.getElementById("story-4");
    const story5 = document.getElementById("story-5");
    const storyMedals = document.getElementById("story-medals");

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: heroSection,
            start: "top top",
            end: "bottom bottom",
            scrub: 1
        }
    });

    // We map the 0-100% progress of the timeline to our frames (0-20, 20-40, etc.)
    // Each block represents 20% of the total scroll

    // Frame 0-20: Story 1
    tl.to(story1, { opacity: 1, duration: 0.5 }, 0)
      .to(story1, { opacity: 0, duration: 0.5 }, 1.5) // Fades out before next starts
      
    // Frame 20-40: Story 2 (Metrics)
      .to(story2, { opacity: 1, duration: 0.5 }, 2)
      // Custom counter animation for Availability
      .to({ val: 0 }, {
          val: 99.95,
          duration: 1,
          onUpdate: function() {
              document.getElementById("availability-counter").innerText = this.targets()[0].val.toFixed(2);
          }
      }, 2)
      .to(story2, { opacity: 0, duration: 0.5 }, 3.5)

    // Frame 40-60: Story 3
      .to(story3, { opacity: 1, duration: 0.5, x: 0, startAt: { x: -50 } }, 4)
      .to(story3, { opacity: 0, duration: 0.5 }, 5.5)

    // Frame 60-80: Story 4
      .to(story4, { opacity: 1, duration: 0.5, x: 0, startAt: { x: 50 } }, 6)
      .to(story4, { opacity: 0, duration: 0.5 }, 7.5)

    // Frame 80-100: Story 5
      .to(story5, { opacity: 1, duration: 0.5, scale: 1, startAt: { scale: 0.9 } }, 8)
      // Fades out before the scroll ends so the final frame is fully visible
      .to(story5, { opacity: 0, duration: 0.5 }, 9.5)
      // Fade in the medals at the very end
      .to(storyMedals, { opacity: 1, duration: 0.5, y: 0, startAt: { y: 20 } }, 9.5);


    // 5. Dashboard Counters Animation
    const counters = document.querySelectorAll(".dash-counter");
    counters.forEach(counter => {
        const target = parseFloat(counter.getAttribute("data-target"));
        const isDecimal = counter.getAttribute("data-decimal") === "true";
        
        ScrollTrigger.create({
            trigger: counter,
            start: "top 80%",
            onEnter: () => {
                gsap.to({ val: 0 }, {
                    val: target,
                    duration: 2,
                    ease: "power2.out",
                    onUpdate: function() {
                        const val = this.targets()[0].val;
                        counter.innerText = isDecimal ? val.toFixed(2) : Math.floor(val);
                    }
                });
            },
            once: true
        });
    });

    // 6. Timeline Animation
    const timelineItems = document.querySelectorAll(".timeline-item");
    
    // Add vertical progress line animation
    const timelineTrigger = document.querySelector(".timeline-trigger");
    if(timelineTrigger) {
        const line = document.createElement("div");
        line.className = "absolute left-8 md:left-1/2 top-0 w-1 bg-accent transform md:-translate-x-1/2 origin-top z-0 shadow-[0_0_10px_rgba(0,229,255,0.5)]";
        timelineTrigger.appendChild(line);

        gsap.set(line, { scaleY: 0 });
        
        gsap.to(line, {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
                trigger: timelineTrigger,
                start: "top 50%",
                end: "bottom 80%",
                scrub: true
            }
        });
    }

    timelineItems.forEach((item, index) => {
        const content = item.querySelectorAll(".timeline-content");
        const dot = item.querySelector(".timeline-dot");
        
        ScrollTrigger.create({
            trigger: item,
            start: "top 70%",
            onEnter: () => {
                gsap.to(content, {
                    opacity: 1,
                    x: 0,
                    duration: 1,
                    ease: "power3.out",
                    stagger: 0.1
                });
                
                // Pop animation for the dot
                gsap.from(dot, {
                    scale: 0,
                    duration: 0.5,
                    ease: "back.out(2)"
                });
            },
            once: true
        });
    });

    // 7. Mouse Glow & Case Studies Animation
    
    // Mouse Glow Effect
    const glow = document.getElementById('mouse-glow');
    if (glow) {
        document.addEventListener('mousemove', (e) => {
            glow.style.opacity = '1';
            gsap.to(glow, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.6,
                ease: "power2.out"
            });
        });
        document.addEventListener('mouseleave', () => {
            glow.style.opacity = '0';
        });
    }

    // Case Studies Reveal
    const caseCards = document.querySelectorAll(".case-card");
    caseCards.forEach((card, index) => {
        ScrollTrigger.create({
            trigger: card,
            start: "top 85%",
            onEnter: () => {
                card.classList.remove("opacity-0", "translate-y-12");
            },
            once: true
        });
    });

    // Testimonials Reveal
    const testimonials = document.querySelectorAll("#testimonials .glass-card");
    testimonials.forEach((testimonial, index) => {
        ScrollTrigger.create({
            trigger: "#testimonials",
            start: "top 70%",
            onEnter: () => {
                testimonial.classList.remove("opacity-0", "translate-y-8", "translate-y-16", "translate-y-12", "translate-y-4");
            },
            once: true
        });
    });

    // 8. War Room Story Modal
    const storyModal = document.getElementById('story-modal');
    const storyModalClose = document.getElementById('story-modal-close');
    const storyModalTag = document.getElementById('story-modal-tag');
    const storyModalTitle = document.getElementById('story-modal-title');
    const storyModalExcerpt = document.getElementById('story-modal-excerpt');
    const storyModalLesson = document.getElementById('story-modal-lesson');
    const storyModalImpact = document.getElementById('story-modal-impact');
    const storyModalResolution = document.getElementById('story-modal-resolution');
    const storyModalTakeaway = document.getElementById('story-modal-takeaway');
    const storyModalStatus = document.getElementById('story-modal-status');
    const storyModalResponse = document.getElementById('story-modal-response');

    const stories = {
        '7-minute-decision': {
            tag: 'Incident Bridge',
            title: 'The 7-Minute Decision That Prevented a 4-Hour Outage',
            excerpt: 'A decisive operations escalation that stabilized systems before customer impact reached peak alerting.',
            lesson: 'Decisive escalation can close the gap between detection and containment.',
            impact: 'Kept the customer-visible window under the most expensive threshold and avoided broader downtime.',
            resolution: 'Isolated the failing service and applied a targeted circuit breaker while maintaining traffic flow.',
            takeaway: 'Fast, aligned decisions save hours when the bridge focus stays on the right scope.',
            status: 'Active escalation',
            response: '00:07'
        },
        'monitoring-green': {
            tag: 'Network Map',
            title: 'When Monitoring Was Green But Customers Could Not Pay',
            excerpt: 'A hidden payment path failure that needed cross-team coordination and customer-impact triage.',
            lesson: 'Operational visibility must extend beyond surface alerts to capture true customer impact.',
            impact: 'Prevented broad customer churn by surfacing the issue before executive teams escalated.',
            resolution: 'Synchronized payments, network, and ops teams to isolate the failed service and restore transactions.',
            takeaway: 'Know which metrics matter most for the business, not just what the dashboard highlights.',
            status: 'In review',
            response: '00:12'
        },
        'global-failure': {
            tag: 'Dashboard',
            title: 'The Change That Triggered a Global Service Failure',
            excerpt: 'A release rollback mission that turned an outage into a learning opportunity for enterprise reliability.',
            lesson: 'Bridge leadership must treat change execution as a crisis vector, not just a deployment event.',
            impact: 'Minimized global impact by stopping the rollout and restoring service before recovery window widened.',
            resolution: 'Coordinated an emergency rollback while maintaining stakeholder confidence through transparent updates.',
            takeaway: 'The right call is often the one that prevents a half-measure reaction in a high-stakes incident.',
            status: 'Post-incident analysis',
            response: '00:22'
        }
    };

    const openStoryModal = (storyKey) => {
        const story = stories[storyKey];
        if (!story || !storyModal) return;

        storyModalTag.textContent = story.tag;
        storyModalTitle.textContent = story.title;
        storyModalExcerpt.textContent = story.excerpt;
        storyModalLesson.textContent = story.lesson;
        storyModalImpact.textContent = story.impact;
        storyModalResolution.textContent = story.resolution;
        storyModalTakeaway.textContent = story.takeaway;
        storyModalStatus.textContent = story.status;
        storyModalResponse.textContent = story.response;

        storyModal.classList.remove('hidden');
        storyModal.classList.add('show');
    };

    const closeStoryModal = () => {
        if (!storyModal) return;
        storyModal.classList.remove('show');
        storyModal.classList.add('hidden');
    };

    document.querySelectorAll('.story-card').forEach(card => {
        card.addEventListener('click', () => {
            const storyKey = card.dataset.story;
            openStoryModal(storyKey);
        });
    });

    if (storyModalClose) {
        storyModalClose.addEventListener('click', closeStoryModal);
    }

    if (storyModal) {
        storyModal.addEventListener('click', (event) => {
            if (event.target === storyModal) {
                closeStoryModal();
            }
        });
    }

    // 9. Incident Leadership Wheel
    const leadershipTitle = document.getElementById('leadership-title');
    const leadershipDescription = document.getElementById('leadership-description');
    document.querySelectorAll('.command-node').forEach(node => {
        node.addEventListener('mouseenter', () => {
            const title = node.dataset.title;
            const description = node.dataset.description;
            leadershipTitle.textContent = title;
            leadershipDescription.textContent = description;
            document.querySelectorAll('.command-node').forEach(n => n.classList.remove('active'));
            node.classList.add('active');
        });
    });

    // 10. Bridge Playbook Progress
    const bridgeProgress = document.getElementById('bridge-progress');
    const playbookStages = document.querySelectorAll('.playbook-stage');
    playbookStages.forEach(stage => {
        ScrollTrigger.create({
            trigger: stage,
            start: 'top 80%',
            onEnter: () => {
                stage.classList.add('visible');
            },
            once: true
        });
    });

    if (bridgeProgress) {
        ScrollTrigger.create({
            trigger: '#bridge-playbook',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.3,
            onUpdate: self => {
                const height = Math.max(10, Math.min(100, self.progress * 100));
                bridgeProgress.style.height = `${height}%`;
            }
        });
    }

    // 12. Rich scroll-triggered text animations

    // --- Helper: split text into words wrapped in <span> ---
    function splitTextIntoWords(el) {
        const text = el.textContent;
        el.innerHTML = '';
        const words = text.split(/\s+/);
        words.forEach((word, i) => {
            const span = document.createElement('span');
            span.textContent = word;
            span.style.display = 'inline-block';
            span.style.overflow = 'hidden';
            span.style.verticalAlign = 'top';
            span.style.paddingTop = '0.15em';
            if (i < words.length - 1) {
                span.style.marginRight = '0.25em';
            }
            el.appendChild(span);
        });
    }

    // --- Helper: split text into characters wrapped in <span> ---
    function splitTextIntoChars(el) {
        const text = el.textContent;
        el.innerHTML = '';
        for (const ch of text) {
            const span = document.createElement('span');
            span.textContent = ch === ' ' ? '\u00A0' : ch;
            span.style.display = 'inline-block';
            el.appendChild(span);
        }
    }

    // --- 12a. Heading word-stagger reveal (blur + slide + slight rotation) ---
    const headingsToAnimate = document.querySelectorAll(
        '#war-room h2, #leadership h2, #scenario-sim h2, #dashboard h2'
    );
    headingsToAnimate.forEach((h2) => {
        splitTextIntoWords(h2);
        const words = h2.querySelectorAll('span');
        gsap.set(words, { opacity: 0, y: 60, rotateX: -30, filter: 'blur(8px)' });
        gsap.to(words, {
            opacity: 1,
            y: 0,
            rotateX: 0,
            filter: 'blur(0px)',
            duration: 0.8,
            stagger: 0.05,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: h2,
                start: 'top 82%',
                toggleActions: 'play none play none',
            },
        });
    });

    // --- 12b. Section label (monospace tracking text) — character scramble reveal ---
    const sectionLabels = document.querySelectorAll(
        '#war-room .text-accent.font-mono, #scenario-sim .text-accent.font-mono, #dashboard .text-accent.font-mono, #leadership .text-accent.font-mono, #bridge-playbook .text-accent.font-mono'
    );
    sectionLabels.forEach((label) => {
        const originalText = label.textContent;
        splitTextIntoChars(label);
        const chars = label.querySelectorAll('span');
        // Scramble chars
        const scrambleChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        chars.forEach((span) => {
            span.style.opacity = '1';
            if (span.textContent === '\u00A0') return;
            const original = span.textContent;
            let iterations = 0;
            const maxIterations = 6;
            const interval = setInterval(() => {
                span.textContent = scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
                iterations++;
                if (iterations >= maxIterations) {
                    clearInterval(interval);
                    span.textContent = original;
                }
            }, 50);
        });

        gsap.from(chars, {
            opacity: 0,
            y: 4,
            duration: 0.4,
            stagger: 0.03,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: label,
                start: 'top 88%',
                toggleActions: 'play none play none',
            },
        });
    });

    // --- 12c. Paragraph text — line-clip reveal ---
    const parasToAnimate = document.querySelectorAll(
        '#about p, #war-room .text-gray-400.max-w-2xl, #scenario-sim .text-gray-400.max-w-xl, #dashboard .text-gray-400.max-w-xl, #leadership .text-gray-400.max-w-xl'
    );
    parasToAnimate.forEach((p) => {
        gsap.set(p, { clipPath: 'inset(0 0 100% 0)', opacity: 1 });
        gsap.to(p, {
            clipPath: 'inset(0 0 0% 0)',
            duration: 1.2,
            ease: 'power3.inOut',
            scrollTrigger: {
                trigger: p,
                start: 'top 85%',
                toggleActions: 'play none play none',
            },
        });
    });

    // --- 12d. Glass cards — staggered 3D flip-up reveal ---
    const glassCards = document.querySelectorAll('#about .glass-card, #dashboard .glass-card');
    glassCards.forEach((card, i) => {
        gsap.set(card, { opacity: 0, y: 60, rotateX: 15, scale: 0.92 });
        gsap.to(card, {
            opacity: 1,
            y: 0,
            rotateX: 0,
            scale: 1,
            duration: 0.7,
            delay: i * 0.08,
            ease: 'back.out(1.4)',
            scrollTrigger: {
                trigger: card.parentElement,
                start: 'top 82%',
                toggleActions: 'play none play none',
            },
        });
    });

    // --- 12e. Command wheel — rotate-in reveal ---
    const commandWheel = document.querySelector('#leadership .command-wheel');
    if (commandWheel) {
        gsap.set(commandWheel, { opacity: 0, rotation: -15, scale: 0.85 });
        gsap.to(commandWheel, {
            opacity: 1,
            rotation: 0,
            scale: 1,
            duration: 1,
            ease: 'elastic.out(1, 0.6)',
            scrollTrigger: {
                trigger: commandWheel,
                start: 'top 80%',
                toggleActions: 'play none play none',
            },
        });
    }

    // --- 12f. Leadership details — slide from right with blur dissolve ---
    const leadershipDetails = document.querySelector('#leadership #leadership-details');
    if (leadershipDetails) {
        gsap.set(leadershipDetails, { opacity: 0, x: 80, filter: 'blur(10px)' });
        gsap.to(leadershipDetails, {
            opacity: 1,
            x: 0,
            filter: 'blur(0px)',
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: leadershipDetails,
                start: 'top 82%',
                toggleActions: 'play none play none',
            },
        });
    }

    // --- 12g. Scenario cards — slide-up with scale bounce ---
    const scenarioCards = document.querySelectorAll('#scenario-sim .scenario-card');
    scenarioCards.forEach((card, i) => {
        gsap.set(card, { opacity: 0, y: 80, scale: 0.9 });
        gsap.to(card, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.75,
            delay: i * 0.12,
            ease: 'back.out(1.7)',
            scrollTrigger: {
                trigger: card.parentElement,
                start: 'top 82%',
                toggleActions: 'play none play none',
            },
        });
    });

    // --- 12h. Terminal typing animation — chars appear one-by-one with blinking cursor ---
    function createTypingAnimation(el, options = {}) {
        const {
            speed = 40,
            startDelay = 200,
            cursorColor = '#00E5FF',
            showCursor = true,
            prefix = '',
        } = options;

        const fullText = el.textContent.trim();
        if (!fullText) return;

        // Store original text
        el.dataset.originalText = fullText;

        // Build typed content wrapper
        el.innerHTML = '';
        el.style.position = 'relative';

        const textSpan = document.createElement('span');
        textSpan.className = 'typing-text';
        textSpan.textContent = '';
        el.appendChild(textSpan);

        let cursor;
        if (showCursor) {
            cursor = document.createElement('span');
            cursor.className = 'typing-cursor';
            cursor.textContent = '▌';
            cursor.style.color = cursorColor;
            cursor.style.animation = 'cursor-blink 0.8s step-end infinite';
            cursor.style.marginLeft = '2px';
            el.appendChild(cursor);
        }

        let charIndex = 0;
        let started = false;

        const typeNextChar = () => {
            if (charIndex < fullText.length) {
                textSpan.textContent = prefix + fullText.substring(0, charIndex + 1);
                charIndex++;
                setTimeout(typeNextChar, speed + Math.random() * 25);
            }
        };

        ScrollTrigger.create({
            trigger: el,
            start: 'top 88%',
            onEnter: () => {
                if (!started) {
                    started = true;
                    setTimeout(typeNextChar, startDelay);
                }
            },
        });
    }

    // Apply typing animation to section accent labels
    const typingLabels = document.querySelectorAll(
        '#war-room .text-accent.font-mono, #scenario-sim .text-accent.font-mono, #dashboard .text-accent.font-mono, #bridge-playbook .text-accent.font-mono'
    );
    typingLabels.forEach((label) => {
        // Skip labels already handled by scramble (leadership)
        if (label.closest('#leadership')) return;
        createTypingAnimation(label, { speed: 35, cursorColor: '#00E5FF' });
    });

    // Apply typing to the "Who Am I?" heading with a terminal prompt style
    const aboutHeading = document.querySelector('#about h2');
    if (aboutHeading) {
        // Keep the "/" prefix as a static prompt, type the rest
        const slash = aboutHeading.querySelector('.text-accent');
        if (slash) {
            slash.style.visibility = 'visible';
            const textAfter = aboutHeading.childNodes;
            let textContent = '';
            for (const node of textAfter) {
                if (node.nodeType === 3) textContent += node.textContent;
                else if (node !== slash) textContent += node.textContent;
            }
            // Wrap text after slash
            const wrapper = document.createElement('span');
            wrapper.textContent = textContent.trim();
            // Replace text nodes after slash
            while (aboutHeading.lastChild && aboutHeading.lastChild !== slash && aboutHeading.lastChild !== slash.nextSibling) {
                // Keep the structure simple
            }
            // Simpler: just re-wrap
            const fullText = aboutHeading.textContent.trim();
            aboutHeading.innerHTML = '';
            const promptSpan = document.createElement('span');
            promptSpan.className = 'text-accent mr-4';
            promptSpan.textContent = '/';
            promptSpan.style.visibility = 'visible';
            aboutHeading.appendChild(promptSpan);

            const typeTarget = document.createElement('span');
            typeTarget.className = 'typing-target';
            typeTarget.textContent = fullText.replace('/', '').trim();
            aboutHeading.appendChild(typeTarget);

            createTypingAnimation(typeTarget, {
                speed: 45,
                startDelay: 400,
                cursorColor: '#00E5FF',
                prefix: '',
            });

            // Remove from word-stagger list to avoid conflict
            aboutHeading.dataset.typed = 'true';
        }
    }

    // Remove typed headings from word-stagger animation
    const wordStaggerHeadings = document.querySelectorAll('#about h2[data-typed], #about h2 .typing-target');
    // The heading already had spans removed by typing setup, so the word-stagger won't find any spans — safe

    // --- 12i. Syntax-highlight style reveal for bridge-playbook command nodes ---
    const commandNodes = document.querySelectorAll('#bridge-playbook .command-node');
    commandNodes.forEach((node, i) => {
        // Find the title inside the node
        const titleEl = node.querySelector('[data-title]');
        const descEl = node.querySelector('[data-description]');
        if (!titleEl) return;

        const origTitle = titleEl.getAttribute('data-title') || titleEl.textContent;
        titleEl.textContent = '';

        gsap.set(node, { opacity: 0, x: -30 });

        ScrollTrigger.create({
            trigger: node,
            start: 'top 85%',
            onEnter: () => {
                // Slide in node
                gsap.to(node, {
                    opacity: 1,
                    x: 0,
                    duration: 0.5,
                    delay: i * 0.1,
                    ease: 'power2.out',
                });

                // Type title
                let idx = 0;
                const typeTitle = () => {
                    if (idx < origTitle.length) {
                        titleEl.textContent = origTitle.substring(0, idx + 1);
                        idx++;
                        setTimeout(typeTitle, 30 + Math.random() * 20);
                    }
                };
                setTimeout(typeTitle, 300 + i * 100);
            },
        });
    });
    const scenarioPanel = document.getElementById('scenario-panel');
    const scenarioPanelClose = document.getElementById('scenario-panel-close');
    const scenarioPanelTag = document.getElementById('scenario-panel-tag');
    const scenarioPanelTitle = document.getElementById('scenario-panel-title');
    const scenarioPanelSummary = document.getElementById('scenario-panel-summary');
    const scenarioPanelImpact = document.getElementById('scenario-panel-impact');
    const scenarioPanelActions = document.getElementById('scenario-panel-actions');
    const scenarioPanelBridge = document.getElementById('scenario-panel-bridge');
    const scenarioPanelCommunication = document.getElementById('scenario-panel-communication');
    const scenarioPanelRecovery = document.getElementById('scenario-panel-recovery');
    const scenarioPanelLessons = document.getElementById('scenario-panel-lessons');

    const scenarios = {
        'banking-outage': {
            tag: 'Banking',
            title: 'Banking Application Outage',
            summary: 'Prioritize payment flow stabilization and stakeholder confidence for a high-value service.',
            impact: 'A payments outage can erode customer trust and cause immediate financial impact across affected accounts.',
            actions: 'Alert payments, network, and ops teams immediately; validate transaction paths and service dependencies.',
            bridge: 'Open the bridge with payments SME, platform lead, and customer success to align the response.',
            communication: 'Share clear customer impact statements, incident cadence, and contingency expectations.',
            recovery: 'Stabilize transaction pipelines, restore payment submission, and validate with controlled traffic.',
            lessons: 'Every finance incident must be treated as both a technical and business-communications priority.'
        },
        'email-failure': {
            tag: 'Communications',
            title: 'Global Email Failure',
            summary: 'Coordinate escalation with the messaging platform team and keep global business units informed.',
            impact: 'A global mailbox outage affects critical workflows, approvals, and customer communications simultaneously.',
            actions: 'Identify the root cause, isolate affected clusters, and maintain executive status updates.',
            bridge: 'Bring in messaging, infra, and security leads while tracking customer-facing impact explicitly.',
            communication: 'Confirm who owns external messaging, internal status, and recovery expectations.',
            recovery: 'Restore mail path routing, verify queuing behavior, and validate delivery across regions.',
            lessons: 'Incidents at the edge of business operations require tighter communications and faster cross-impact triage.'
        },
        'failed-change': {
            tag: 'Change',
            title: 'Failed Change Deployment',
            summary: 'Execute rollback, communicate risk, and own the bridge workflow from detection to restoration.',
            impact: 'A failed deployment can affect multiple services and trigger cascading failures across critical systems.',
            actions: 'Stop the deployment, assess the rollback plan, and verify the health of dependent services.',
            bridge: 'Align deployment, engineering, and support leads on rollback timing and containment.',
            communication: 'Share risk, next steps, and recovery expectations clearly with every team in the bridge.',
            recovery: 'Execute rollback in stages, confirm stability, and restore customer-facing endpoints.',
            lessons: 'The best incident response is rooted in decisive rollback and transparent bridge control.'
        },
        'db-performance': {
            tag: 'Database',
            title: 'Database Performance Incident',
            summary: 'Manage the performance war room, align DBAs, and protect SLA-driven customer experience.',
            impact: 'Database slowdowns can silently erode customer satisfaction even before full service failure appears.',
            actions: 'Prioritize query blockers, identify resource contention, and route traffic away from impacted clusters.',
            bridge: 'Maintain a tight bridge with database, application, and platform teams while tracking SLA risk.',
            communication: 'Provide focused performance status that prioritizes transaction continuity over feature delivery.',
            recovery: 'Restore database throughput, validate response times, and confirm sustained service performance.',
            lessons: 'Performance incidents demand precise diagnosis and a strong cross-functional command rhythm.'
        },
        'cloud-degradation': {
            tag: 'Cloud',
            title: 'Cloud Service Degradation',
            summary: 'Coordinate cloud providers, impacted applications, and remediation communications across the bridge.',
            impact: 'Cloud degradation can span regions and requires both provider coordination and internal stabilization plans.',
            actions: 'Document affected services, collect provider data, and route around degraded capacity where possible.',
            bridge: 'Include cloud ops, infrastructure, and application leads to align mitigation and restore capacity.',
            communication: 'Speak in terms of business risk, recovery windows, and customer impact to avoid ambiguity.',
            recovery: 'Verify failover paths, ensure redundancy is working, and monitor recovery across regions.',
            lessons: 'Cloud incidents often hinge on communication discipline and relentless focus on service availability.'
        }
    };

    const openScenarioPanel = (scenarioKey) => {
        const scenario = scenarios[scenarioKey];
        if (!scenario || !scenarioPanel) return;

        scenarioPanelTag.textContent = scenario.tag;
        scenarioPanelTitle.textContent = scenario.title;
        scenarioPanelSummary.textContent = scenario.summary;
        scenarioPanelImpact.textContent = scenario.impact;
        scenarioPanelActions.textContent = scenario.actions;
        scenarioPanelBridge.textContent = scenario.bridge;
        scenarioPanelCommunication.textContent = scenario.communication;
        scenarioPanelRecovery.textContent = scenario.recovery;
        scenarioPanelLessons.textContent = scenario.lessons;

        // Stop Lenis, lock scroll
        lenis.stop();
        document.body.style.overflow = 'hidden';
        scenarioPanel.style.display = 'block';
        scenarioPanel.scrollTop = 0;

        // Entrance animation
        gsap.fromTo(scenarioPanel,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
        gsap.fromTo(scenarioPanel.querySelector('.rounded-\\[2rem\\]'),
            { opacity: 0, y: 40, scale: 0.96 },
            { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', delay: 0.1 }
        );
    };

    const closeScenarioPanel = () => {
        if (!scenarioPanel) return;
        gsap.to(scenarioPanel, {
            opacity: 0,
            duration: 0.25,
            ease: 'power2.in',
            onComplete: () => {
                scenarioPanel.style.display = 'none';
                document.body.style.overflow = '';
                lenis.start();
            },
        });
    };

    document.querySelectorAll('.scenario-card').forEach(card => {
        card.addEventListener('click', () => {
            const scenarioKey = card.dataset.scenario;
            openScenarioPanel(scenarioKey);
        });
    });

    if (scenarioPanelClose) {
        scenarioPanelClose.addEventListener('click', closeScenarioPanel);
    }

    if (scenarioPanel) {
        scenarioPanel.addEventListener('click', (event) => {
            if (event.target === scenarioPanel) {
                closeScenarioPanel();
            }
        });
    }

    // Article Cards Functionality
    const articles = [
        {
            id: 'dangerous-person',
            title: 'The Most Dangerous Person on a Major Incident Bridge',
            image: 'most-dangerous-person.png',
            tags: ['Leadership', 'Major Incident Management'],
            publishedDate: 'June 15, 2026',
            views: 2847,
            readingTime: 8,
            content: `<h3>Authority vs. Understanding</h3><p>In a Major Incident, rank doesn't equal incident knowledge. The most dangerous person on the bridge isn't the one who yells the loudest or pulls the highest rank. It's the decision-maker who believes they understand the problem better than the engineers who've been investigating it for the last thirty minutes.</p><p>This VP interrupted a junior database engineer mid-explanation about query deadlocks and demanded an immediate failover to the backup region—a procedure that would have taken 18 minutes, during which customer impact would have increased exponentially. The engineer knew this. The VP didn't.</p><h3>The Price of Overconfidence</h3><p>It took the Incident Manager—not the VP—to pause the bridge and clarify: "We have a containment strategy. We've reduced the blast radius. The engineering team has a fix queued for the next 90 seconds. A failover now would restart that timer and cascade the impact."</p><p>The VP paused. Then he deferred to the engineers.</p><p>The fix shipped in 87 seconds. Customer impact: contained. The VP later told me, "I almost made it worse. And I didn't even know it."</p><h3>What This Teaches About Leadership</h3><p>The most effective leaders during a Major Incident aren't the ones with the biggest titles. They're the ones who:</p><ul><li><strong>Ask before deciding.</strong> "What do you need from me?" is more powerful than directives.</li><li><strong>Trust domain experts.</strong> The people closest to the problem have the most accurate model of it.</li><li><strong>Remove obstacles.</strong> Your job as leadership isn't to drive the solution—it's to clear the path for the people who will.</li><li><strong>Know your role.</strong> In the command center, you're an advisor, not a hero.</li></ul><p>The most dangerous person on a bridge call isn't loud. They're quiet. They're confident without curiosity. They're authorized but not informed.</p><p>Be the other kind of leader.</p>`
        },
        {
            id: 'dashboard-lied',
            title: 'The Day the Dashboard Lied',
            image: 'dashboard-lied.png',
            tags: ['Monitoring', 'Customer Experience'],
            publishedDate: 'June 10, 2026',
            views: 3124,
            readingTime: 9,
            content: `<h3>The Blindness of Good Metrics</h3><p>Our monitoring was tracking the health of the service architecture. What it wasn't tracking was the customer's ability to complete a transaction. The routing layer was healthy. The payment processor was responsive. The database had zero locks.</p><p>But a configuration change three hours earlier had introduced a silent failure in the customer-facing API gateway. Requests weren't erroring. They were timing out silently—and then retrying in a queue that was being dropped due to an unrelated memory pressure event.</p><p>Result: Customers were stuck in a state where their requests weren't returning, and they had no indication why.</p><h3>How We Found the Truth</h3><p>Not through dashboards. Through Twitter.</p><p>A customer tweeted a screenshot of an error message he wasn't supposed to see. That's what triggered the Major Incident. Our monitoring missed it because we weren't measuring what the customer was actually experiencing.</p><p>We had metrics. We had observability. We had a 99-point dashboard stack. What we didn't have was a signal from the customer's perspective.</p><h3>The Lesson: Synthetic Outside-In Monitoring</h3><p>After that incident, we implemented synthetic transactions that mirror the exact customer journey. These run every 30 seconds from multiple geographic locations. If any step fails or times out, we get alerted immediately—before customers report it on social media.</p><p>Perfect infrastructure metrics are worthless if the customer can't use your product. Monitor the outcome, not the parts.</p>`
        },
        {
            id: 'silence-executives',
            title: 'The Silence That Scares Executives',
            image: 'silence-executives.png',
            tags: ['Communication', 'Stakeholder Management'],
            publishedDate: 'June 5, 2026',
            views: 2591,
            readingTime: 7,
            content: `<h3>The Communication Vacuum</h3><p>Here's what I learned: In a Major Incident, silence from leadership creates fear. Fear creates noise. Noise creates panic. Panic creates bad decisions.</p><p>The executives didn't need hourly updates. They needed to know what broke, how many customers are affected, what's the financial impact, when will it be fixed, and what do I need to prepare for.</p><p>For 25 minutes, they had none of that. So they assumed the worst and started preparing accordingly.</p><h3>The Rule: Communicate the Absence of Information</h3><p>I implemented a hard rule: "Even if we don't have answers, we communicate every 10 minutes during an incident escalation. If the only thing we know is 'still investigating,' we say that."</p><p>That took 90 seconds to craft and communicate. It prevented 30 minutes of executive speculation and catastrophizing.</p><h3>What Silence Costs</h3><p>In the absence of information, people fill the gap with imagination—and their imagination is usually worse than reality. When you're silent, executives start drafting crisis communications. They loop in legal. They prepare termination conversations. They lose confidence in the team.</p><p>Communicate early. Communicate often. Even if the only thing you know is "still working on it," say it. The silence is scarier than the truth.</p>`
        },
        {
            id: 'executive-escalation',
            title: 'Why Every Incident Doesn\'t Need an Executive Escalation',
            image: 'executive-escalation.png',
            tags: ['Leadership', 'Escalation Management'],
            publishedDate: 'May 28, 2026',
            views: 1983,
            readingTime: 6,
            content: `<h3>The Hierarchy Trap</h3><p>There's a belief in organizations: "More senior people = faster resolution." This is often false.</p><p>In this case, the VP of Engineering started asking about architectural decisions made two years ago. This was not helpful context for fixing a query timeout today. The VP of Product wanted to know if customers had noticed.</p><p>Both of these questions were reasonable. But asking them during active resolution added noise, interrupted the engineer's flow state, and—paradoxically—slowed things down.</p><h3>When to Escalate. When Not To.</h3><p><strong>Escalate if:</strong></p><ul><li>The technical team doesn't have authorization to make the decision needed to fix it</li><li>Customer communications need executive sign-off</li><li>You're hitting the limits of current expertise</li><li>It's been 30+ minutes with no forward progress</li></ul><p><strong>Don't escalate just because:</strong></p><ul><li>It's severe (severity is about impact, not about escalation level)</li><li>It affects a big customer (handle it well instead)</li><li>You're nervous (get confidence from better comms, not more hierarchy)</li></ul><h3>The Better Approach</h3><p>Keep escalations minimal. Bring in senior folks when you need a decision, not a second opinion. Let the engineers do their work. Escalation should be a tool for unblocking decisions, not a confidence boost.</p>`
        },
        {
            id: 'first-15-minutes',
            title: 'The First 15 Minutes Decide Everything',
            image: 'first-15-minutes.png',
            tags: ['Incident Response', 'Operations'],
            publishedDate: 'May 20, 2026',
            views: 4156,
            readingTime: 10,
            content: `<h3>Decision 1: Do We Declare P1?</h3><p>At 11:04 AM, we declared P1 (critical incident). This decision meant executive visibility, escalation protocol engagement, customer communication preparation. It was the right call, but we made it in the first minute—before we even knew the blast radius.</p><p>Rule: Declare at impact, not certainty. If it smells like it could be big, declare it. You can downgrade. You can't un-panic people once they're panicked.</p><h3>Decision 2: Do We Start a Customer Communication?</h3><p>At 11:06 AM, we posted a message to our status page: "We're investigating an issue affecting customer connectivity. Updates every 5 minutes."</p><p>We didn't say what we thought was broken. We just said what we knew. This prevented customers from panicking.</p><h3>Decision 3: Who Gets Looped In?</h3><p>At 11:08 AM, we brought in the right people. Small, focused team = fast decisions. Large committee = process delays.</p><h3>Decision 4: What's Our Diagnostic Strategy?</h3><p>Instead of everyone investigating everything, we split responsibilities and ran diagnostics in parallel. Parallel investigation beats serial investigation every time. We found the root cause by 11:13 AM.</p><h3>Decision 5: What's Our Fix Strategy?</h3><p>We had options and chose the best one. By 11:22 AM, customers were connected.</p><h3>Why the First 15 Minutes Matter</h3><p>Each decision we made in that window cascaded into efficiency. The incident resolved in 19 minutes. But it was decided in the first 15.</p><p>Your incident response playbook isn't about what to do when something breaks. It's about what to decide in the chaos before you have time to think clearly.</p>`
        },
        {
            id: '3am-outage',
            title: 'What a 3 AM Outage Teaches About Leadership',
            image: '3am-outage.png',
            tags: ['Leadership', 'Operations'],
            publishedDate: 'May 12, 2026',
            views: 3458,
            readingTime: 8,
            content: `<h3>The Difference Between Stress and Urgency</h3><p>Stress is emotional. It's panic. It's shortcuts and assumptions. Urgency is focused. It's clarity and speed. Both feel intense, but they produce opposite results.</p><p>When I joined the bridge call at 3:19 AM, the first engineer I heard was rushing. Someone had already started to spiral. My first message made the implicit message explicit: Panic is optional. We have a process.</p><p>I didn't minimize the problem. I didn't say "it's going to be fine." I just created calm focus.</p><h3>The Speech That Wasn't Panicked</h3><p>I then said to the team: "We have 40% throughput down. That's significant. We also have 60% still running, which means it's not a complete infrastructure failure. Here's what that tells us: the issue is localized."</p><p>That was psychology. I was anchoring them to a manageable scope and an achievable timeline.</p><h3>What This Teaches</h3><p>Leadership at 3 AM isn't about technical skill. It's about emotional regulation. Your emotional state is contagious. Choose it wisely. Leadership is a choice. Make it at 3 AM, and it ripples through the whole incident.</p>`
        },
        {
            id: 'activity-vs-progress',
            title: 'The Difference Between Activity and Progress During Incidents',
            image: 'activity-vs-progress.png',
            tags: ['Operational Excellence', 'Incident Management'],
            publishedDate: 'April 28, 2026',
            views: 2214,
            readingTime: 7,
            content: `<h3>The Busy Trap</h3><p>At 2:30 PM, we had a Major Incident. By 2:45 PM, we had seventeen people on the bridge call, each one "working on" the problem. By 3:15 PM, we still didn't know what was wrong.</p><p>We had maximum activity and minimum progress.</p><h3>The Difference</h3><p><strong>Activity:</strong> Someone is doing something. It feels productive. Nothing is progressing faster.</p><p><strong>Progress:</strong> We know more than we did five minutes ago, and we're closer to a fix.</p><p>After that incident, I implemented a simple rule: Before anyone joins the bridge call, they must have a specific mission.</p><h3>Mission-Based Investigation</h3><p>The new structure with specific roles kept everyone focused. With mission-based assignments, our MTTR (Mean Time To Resolution) dropped 40%. Not because people were smarter. Because people weren't duplicating effort and creating noise.</p><p>During incidents, activity is the enemy of progress. Focus is the friend.</p>`
        },
        {
            id: 'valuable-person',
            title: 'The Most Valuable Person During a Major Incident Is Often Not the Smartest',
            image: 'valuable-person.png',
            tags: ['Leadership', 'Teamwork'],
            publishedDate: 'April 15, 2026',
            views: 3687,
            readingTime: 9,
            content: `<h3>Why the Smartest Person Isn't Always the Most Useful</h3><p>We had an incident where our most brilliant engineer—the architect who designed half our system—was on the bridge call. He was also making it worse. Meanwhile, a mid-level engineer with half his tenure was the person actually moving us toward resolution.</p><p>The architect was asking deep questions about long-term implications. These were excellent questions—for a postmortem meeting. During active incident? They were distracting.</p><p>The mid-level engineer was focused on one thing: "What specific thing changed, and can we undo it?" Boring. Simple. Effective.</p><h3>The Incident Hierarchy vs. The Org Hierarchy</h3><p>Most organizations have one hierarchy. But during incidents, you need a different one.</p><p>The best incident leader is clear-headed, willing to be wrong, outcome-focused, good at delegation, and communicates frequently. Intelligence helps. But these qualities matter more than raw IQ.</p><h3>The Most Valuable Archetype</h3><p>The most valuable person on the bridge is often mid-level in their technical career, calm under pressure, good at saying "I don't know, let's find out," organized, and willing to escalate. This archetype often has zero correlation with organizational rank.</p>`
        },
        {
            id: 'outage-fixed',
            title: 'The Outage Was Fixed. The Incident Was Not.',
            image: 'outage-fixed.jpeg',
            tags: ['Service Recovery', 'Lessons Learned'],
            publishedDate: 'April 5, 2026',
            views: 2945,
            readingTime: 8,
            content: `<h3>What Happens After "Service is Up"</h3><p>Most teams treat an incident like a light switch: off (problem) or on (problem solved). But incidents are more like a film production: the action scenes are the outage, but there are hours of work after cameras stop rolling.</p><p>The phases after "service restored" include validation, communication, immediate hardening, root cause analysis, and remediation planning. Teams that skip these phases have higher repeat incident rates, customer trust issues, and miss organizational lessons.</p><h3>The Reframe</h3><p>An incident isn't over when service is restored. It's over when you've learned from it and prevented it from happening again. The outage was 45 minutes. But the incident was 8 hours of follow-up work that determined whether this happens again next month or never again.</p><p>Don't end the incident when service is up. End it when you've learned.</p>`
        }
    ];

    // Render Article Cards — show top 3, rest hidden behind "View More"
    const articlesGrid = document.getElementById('articles-grid');
    const viewMoreBtn = document.getElementById('view-more-btn');
    const viewMoreWrapper = document.getElementById('view-more-wrapper');
    const INITIAL_VISIBLE = 3;
    let allCards = [];
    let expanded = false;

    if (articlesGrid) {
        articles.forEach((article, index) => {
            const card = document.createElement('div');
            card.className = 'article-card';
            if (index >= INITIAL_VISIBLE) {
                card.style.display = 'none';
                card.classList.add('hidden-card');
            }
            card.innerHTML = `
                <img src="Blog/${article.image}" alt="${article.title}" class="article-image" onerror="this.src='https://via.placeholder.com/400x300?text=${article.title.replace(/\s+/g, '+')}'">
                <div class="article-content">
                    <h3 class="article-title">${article.title}</h3>
                    <div class="article-tags">
                        ${article.tags.map(tag => `<span class="article-tag">${tag}</span>`).join('')}
                    </div>
                    <div class="article-meta">
                        <span class="article-meta-item date">${article.publishedDate}</span>
                        <span class="article-meta-item time">${article.readingTime} min read</span>
                        <span class="article-meta-item views">${article.views.toLocaleString()} views</span>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => openArticle(article));
            articlesGrid.appendChild(card);
            allCards.push(card);
        });

        // Hide button if 3 or fewer articles
        if (articles.length <= INITIAL_VISIBLE && viewMoreWrapper) {
            viewMoreWrapper.style.display = 'none';
        }
    }

    // View More — reveal hidden cards with staggered animation
    if (viewMoreBtn) {
        viewMoreBtn.addEventListener('click', () => {
            if (expanded) return;
            expanded = true;

            const hiddenCards = allCards.filter(c => c.classList.contains('hidden-card'));

            // Show cards
            hiddenCards.forEach(card => {
                card.style.display = '';
            });

            // Staggered reveal animation
            gsap.fromTo(hiddenCards, {
                opacity: 0,
                y: 60,
                scale: 0.92,
                filter: 'blur(6px)',
            }, {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'blur(0px)',
                duration: 0.7,
                stagger: 0.1,
                ease: 'power3.out',
                onComplete: () => {
                    hiddenCards.forEach(c => c.classList.remove('hidden-card'));
                },
            });

            // Animate button out
            gsap.to(viewMoreBtn, {
                opacity: 0,
                y: 20,
                scale: 0.95,
                duration: 0.4,
                ease: 'power2.in',
                onComplete: () => {
                    if (viewMoreWrapper) viewMoreWrapper.style.display = 'none';
                    // Re-trigger ScrollTrigger refresh for new layout height
                    ScrollTrigger.refresh();
                },
            });
        });
    }

    // Article Viewer — Overlay Modal
    const articleViewer = document.getElementById('article-viewer');
    const closeArticleBtn = document.getElementById('close-article');
    const shareBtn = document.getElementById('share-article');
    const copyLinkBtn = document.getElementById('copy-link');
    const articleContentEl = document.getElementById('article-content');
    let currentArticle = null;

    const openArticle = (article) => {
        currentArticle = article;
        
        document.getElementById('article-hero-image').src = 'Blog/' + article.image;
        document.getElementById('article-title').textContent = article.title;
        document.getElementById('article-date').textContent = article.publishedDate;
        document.getElementById('article-reading-time').textContent = `${article.readingTime} min read`;
        let storedViews = localStorage.getItem('views_' + article.id) ? parseInt(localStorage.getItem('views_' + article.id)) : article.views; storedViews++; localStorage.setItem('views_' + article.id, storedViews); document.getElementById('article-views').textContent = storedViews.toLocaleString() + ' views';
        
        const tagsContainer = document.getElementById('article-tags');
        tagsContainer.innerHTML = article.tags.map(tag => `<span class="article-tag">${tag}</span>`).join('');
        
        articleContentEl.innerHTML = article.content;
        
        // Stop Lenis smooth scroll so modal scroll works independently
        lenis.stop();
        document.body.style.overflow = 'hidden';
        
        // Show overlay
        articleViewer.style.display = 'block';
        articleViewer.scrollTop = 0;
        
        // Entrance animation
        gsap.fromTo(articleViewer, 
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
        gsap.fromTo(articleViewer.querySelector('.rounded-\\[2rem\\]'), 
            { opacity: 0, y: 40, scale: 0.96 },
            { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', delay: 0.1 }
        );
        
        // Reset reading progress
        updateReadingProgress();
    };

    const closeArticle = () => {
        // Exit animation
        gsap.to(articleViewer, {
            opacity: 0,
            duration: 0.25,
            ease: 'power2.in',
            onComplete: () => {
                articleViewer.style.display = 'none';
                document.body.style.overflow = '';
                lenis.start();
                currentArticle = null;
            },
        });
    };

    const updateReadingProgress = () => {
        const progressBar = document.getElementById('reading-progress');
        if (!articleViewer || articleViewer.style.display === 'none') return;
        
        const scrollTop = articleViewer.scrollTop;
        const scrollHeight = articleViewer.scrollHeight - articleViewer.clientHeight;
        const scrolled = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        progressBar.style.width = scrolled + '%';
    };

    // Trap wheel events inside the article overlay
    if (articleViewer) {
        articleViewer.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });
        articleViewer.addEventListener('scroll', updateReadingProgress);
    }

    if (closeArticleBtn) {
        closeArticleBtn.addEventListener('click', closeArticle);
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (currentArticle && navigator.share) {
                navigator.share({
                    title: currentArticle.title,
                    text: `Check out: ${currentArticle.title}`,
                    url: window.location.href
                });
            } else if (currentArticle) {
                alert(`Share: ${currentArticle.title}\n\n${window.location.href}`);
            }
        });
    }

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href);
            const originalText = copyLinkBtn.textContent;
            copyLinkBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyLinkBtn.textContent = originalText;
            }, 2000);
        });
    }

    window.addEventListener('scroll', updateReadingProgress);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeStoryModal();
            closeScenarioPanel();
            closeArticle();
        }
    });

});

