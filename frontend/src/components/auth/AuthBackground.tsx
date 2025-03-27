import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

export default function AuthBackground({ children }: AuthBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const setCanvasDimensions = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);
    
    // Grid lines for robotic/tech look
    const gridSize = Math.max(Math.floor(window.innerWidth / 50), 10);
    const gridLineCount = Math.min(Math.floor(window.innerWidth / 30), 50);
    
    // Data points for digital/mechanical movement
    interface DataPoint {
      x: number;
      y: number;
      destX: number;
      destY: number;
      speed: number;
      size: number;
      type: 'circle' | 'square' | 'triangle';
      rotation: number;
      rotationSpeed: number;
    }
    
    // Generate data points
    const dataPoints: DataPoint[] = [];
    const pointCount = Math.min(Math.floor(window.innerWidth / 100), 20);
    
    for (let i = 0; i < pointCount; i++) {
      // Random position within canvas
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      
      // Random destination
      const destX = Math.random() * canvas.width;
      const destY = Math.random() * canvas.height;
      
      dataPoints.push({
        x,
        y,
        destX,
        destY,
        speed: 0.3 + Math.random() * 0.5,
        size: 4 + Math.random() * 8,
        type: Math.random() < 0.33 ? 'circle' : (Math.random() < 0.5 ? 'square' : 'triangle'),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02
      });
    }
    
    // Generate binary data for background
    interface BinaryData {
      x: number;
      y: number;
      value: '0' | '1';
      alpha: number;
      fadeDirection: 'in' | 'out';
      fadeSpeed: number;
    }
    
    const binaryData: BinaryData[] = [];
    const binaryCount = Math.min(Math.floor(window.innerWidth / 15), 200);
    
    for (let i = 0; i < binaryCount; i++) {
      binaryData.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        value: Math.random() < 0.5 ? '0' : '1',
        alpha: Math.random() * 0.3,
        fadeDirection: Math.random() < 0.5 ? 'in' : 'out',
        fadeSpeed: 0.005 + Math.random() * 0.01
      });
    }
    
    // Colors in monochrome scheme
    const colors = {
      background: '#f8f8f8',
      gridLines: 'rgba(200, 200, 200, 0.3)',
      gridAccent: 'rgba(150, 150, 150, 0.5)',
      dataPoints: 'rgba(50, 50, 50, 0.8)',
      dataConnections: 'rgba(100, 100, 100, 0.2)',
      binaryText: 'rgba(100, 100, 100, 0.5)',
      robot: {
        body: 'rgba(60, 60, 60, 0.9)',
        head: 'rgba(45, 45, 45, 0.9)',
        eyes: 'rgba(220, 220, 220, 0.9)',
        accent: 'rgba(80, 80, 80, 0.9)',
        arm: 'rgba(70, 70, 70, 0.9)',
        highlight: 'rgba(180, 180, 180, 0.8)',
      }
    };
    
    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return;
      
      // Clear canvas
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid lines
      const gridSpacingX = canvas.width / gridLineCount;
      const gridSpacingY = canvas.height / gridLineCount;
      
      // Draw horizontal grid lines
      for (let i = 0; i < gridLineCount; i++) {
        const y = i * gridSpacingY;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.strokeStyle = i % 5 === 0 ? colors.gridAccent : colors.gridLines;
        ctx.lineWidth = i % 5 === 0 ? 0.7 : 0.3;
        ctx.stroke();
      }
      
      // Draw vertical grid lines
      for (let i = 0; i < gridLineCount; i++) {
        const x = i * gridSpacingX;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.strokeStyle = i % 5 === 0 ? colors.gridAccent : colors.gridLines;
        ctx.lineWidth = i % 5 === 0 ? 0.7 : 0.3;
        ctx.stroke();
      }
      
      // Update and draw binary data
      binaryData.forEach(bit => {
        // Update alpha
        if (bit.fadeDirection === 'in') {
          bit.alpha += bit.fadeSpeed;
          if (bit.alpha >= 0.5) {
            bit.fadeDirection = 'out';
            bit.alpha = 0.5;
          }
        } else {
          bit.alpha -= bit.fadeSpeed;
          if (bit.alpha <= 0.05) {
            bit.fadeDirection = 'in';
            bit.alpha = 0.05;
            // Randomly change value when nearly invisible
            bit.value = Math.random() < 0.5 ? '0' : '1';
          }
        }
        
        // Draw binary digit
        ctx.font = '10px Consolas, monospace';
        ctx.fillStyle = `rgba(100, 100, 100, ${bit.alpha})`;
        ctx.fillText(bit.value, bit.x, bit.y);
      });
      
      // Connect some data points with lines to create a network look
      ctx.strokeStyle = colors.dataConnections;
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < dataPoints.length; i++) {
        for (let j = i + 1; j < dataPoints.length; j++) {
          const dx = dataPoints[i].x - dataPoints[j].x;
          const dy = dataPoints[i].y - dataPoints[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(dataPoints[i].x, dataPoints[i].y);
            ctx.lineTo(dataPoints[j].x, dataPoints[j].y);
            ctx.stroke();
          }
        }
      }
      
      // Update and draw data points
      dataPoints.forEach(point => {
        // Move toward destination
        const dx = point.destX - point.x;
        const dy = point.destY - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
          point.x += (dx / distance) * point.speed;
          point.y += (dy / distance) * point.speed;
        } else {
          // Set new destination when reached
          point.destX = Math.random() * canvas.width;
          point.destY = Math.random() * canvas.height;
        }
        
        // Update rotation
        point.rotation += point.rotationSpeed;
        
        // Draw based on shape type
        ctx.fillStyle = colors.dataPoints;
        ctx.strokeStyle = colors.dataPoints;
        
        // Save context before rotation
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(point.rotation);
        
        switch (point.type) {
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, point.size / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'square':
            ctx.fillRect(-point.size / 2, -point.size / 2, point.size, point.size);
            break;
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -point.size / 2);
            ctx.lineTo(point.size / 2, point.size / 2);
            ctx.lineTo(-point.size / 2, point.size / 2);
            ctx.closePath();
            ctx.fill();
            break;
        }
        
        // Restore context after drawing
        ctx.restore();
      });
      
      // Draw a animated robot waving in the corner
      const robotSize = Math.min(canvas.width, canvas.height) * 0.15;
      const robotX = canvas.width * 0.85;
      const robotY = canvas.height * 0.85;
      
      // Animation timing based on current time
      const now = Date.now();
      const waveSpeed = 2000; // Wave cycle duration in ms
      const waveAngle = Math.sin((now % waveSpeed) / waveSpeed * Math.PI * 2) * 0.3;
      const blinkInterval = 3000; // Eye blink interval in ms
      const isBlinking = (now % blinkInterval) < 200; // Blink for 200ms
      
      // Draw robot body (slightly tilted rectangle)
      ctx.save();
      ctx.translate(robotX, robotY);
      ctx.rotate(-0.1); // Slight tilt for character
      
      // Body
      const bodyWidth = robotSize * 0.6;
      const bodyHeight = robotSize * 0.8;
      ctx.fillStyle = colors.robot.body;
      roundRect(ctx, -bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, 10);
      
      // Head
      const headSize = robotSize * 0.4;
      ctx.fillStyle = colors.robot.head;
      roundRect(ctx, -headSize / 2, -bodyHeight / 2 - headSize * 0.8, headSize, headSize * 0.8, 8);
      
      // Eyes
      const eyeSize = headSize * 0.2;
      const eyeSpacing = headSize * 0.3;
      ctx.fillStyle = colors.robot.eyes;
      
      if (isBlinking) {
        // Blinking eyes (small rectangles)
        ctx.fillRect(-eyeSpacing / 2 - eyeSize / 2, -bodyHeight / 2 - headSize * 0.5, eyeSize, eyeSize * 0.2);
        ctx.fillRect(eyeSpacing / 2 - eyeSize / 2, -bodyHeight / 2 - headSize * 0.5, eyeSize, eyeSize * 0.2);
      } else {
        // Open eyes (circles)
        ctx.beginPath();
        ctx.arc(-eyeSpacing / 2, -bodyHeight / 2 - headSize * 0.5, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(eyeSpacing / 2, -bodyHeight / 2 - headSize * 0.5, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Mouth (friendly smile)
      ctx.beginPath();
      ctx.strokeStyle = colors.robot.highlight;
      ctx.lineWidth = 2;
      ctx.arc(0, -bodyHeight / 2 - headSize * 0.3, headSize * 0.2, 0.2, Math.PI - 0.2);
      ctx.stroke();
      
      // Antenna
      ctx.beginPath();
      ctx.strokeStyle = colors.robot.accent;
      ctx.lineWidth = 3;
      ctx.moveTo(0, -bodyHeight / 2 - headSize * 0.8);
      ctx.lineTo(0, -bodyHeight / 2 - headSize * 0.9 - robotSize * 0.1);
      ctx.stroke();
      
      // Antenna top
      ctx.beginPath();
      ctx.fillStyle = colors.robot.highlight;
      ctx.arc(0, -bodyHeight / 2 - headSize * 0.9 - robotSize * 0.1, robotSize * 0.03, 0, Math.PI * 2);
      ctx.fill();
      
      // Robot chest light/emblem
      ctx.beginPath();
      ctx.fillStyle = colors.robot.highlight;
      ctx.arc(0, -bodyHeight * 0.2, bodyWidth * 0.1, 0, Math.PI * 2);
      ctx.fill();
      
      // Body details/seams
      ctx.beginPath();
      ctx.strokeStyle = colors.robot.accent;
      ctx.lineWidth = 2;
      ctx.moveTo(-bodyWidth * 0.3, -bodyHeight * 0.1);
      ctx.lineTo(bodyWidth * 0.3, -bodyHeight * 0.1);
      ctx.stroke();
      
      // Left arm (static)
      ctx.fillStyle = colors.robot.arm;
      ctx.beginPath();
      ctx.roundRect(-bodyWidth / 2 - robotSize * 0.12, -bodyHeight * 0.3, robotSize * 0.12, bodyHeight * 0.5, 5);
      ctx.fill();
      
      // Left hand
      ctx.beginPath();
      ctx.fillStyle = colors.robot.head;
      ctx.arc(-bodyWidth / 2 - robotSize * 0.12 - robotSize * 0.05, -bodyHeight * 0.3 + bodyHeight * 0.5, robotSize * 0.05, 0, Math.PI * 2);
      ctx.fill();
      
      // Right arm (waving) - rotate around shoulder joint
      ctx.save();
      ctx.translate(bodyWidth / 2, -bodyHeight * 0.3); // Shoulder position
      ctx.rotate(-Math.PI / 4 + waveAngle);
      
      // Upper arm
      ctx.fillStyle = colors.robot.arm;
      ctx.fillRect(0, 0, robotSize * 0.12, bodyHeight * 0.3);
      
      // Lower arm (at elbow joint) - add extra angle for waving
      ctx.save();
      ctx.translate(robotSize * 0.12, bodyHeight * 0.3); // Elbow position
      ctx.rotate(Math.PI / 4 + waveAngle * 1.5);
      
      // Forearm
      ctx.fillStyle = colors.robot.arm;
      ctx.fillRect(0, 0, bodyHeight * 0.25, robotSize * 0.1);
      
      // Hand
      ctx.beginPath();
      ctx.fillStyle = colors.robot.head;
      ctx.arc(bodyHeight * 0.25 + robotSize * 0.05, robotSize * 0.05, robotSize * 0.05, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore(); // Restore after elbow rotation
      ctx.restore(); // Restore after shoulder rotation
      
      // Legs
      const legWidth = bodyWidth * 0.15;
      const legHeight = bodyHeight * 0.3;
      const legSpacing = bodyWidth * 0.3;
      
      // Left leg
      ctx.fillStyle = colors.robot.arm;
      roundRect(ctx, -legSpacing / 2 - legWidth / 2, bodyHeight / 2, legWidth, legHeight, 5);
      
      // Left foot
      ctx.fillStyle = colors.robot.head;
      roundRect(ctx, -legSpacing / 2 - legWidth * 1.2 / 2, bodyHeight / 2 + legHeight, legWidth * 1.2, legHeight * 0.2, 5);
      
      // Right leg
      ctx.fillStyle = colors.robot.arm;
      roundRect(ctx, legSpacing / 2 - legWidth / 2, bodyHeight / 2, legWidth, legHeight, 5);
      
      // Right foot
      ctx.fillStyle = colors.robot.head;
      roundRect(ctx, legSpacing / 2 - legWidth * 1.2 / 2, bodyHeight / 2 + legHeight, legWidth * 1.2, legHeight * 0.2, 5);
      
      // Speech bubble occasionally
      if ((now % 5000) < 2000) { // Show every 5 seconds for 2 seconds
        const bubbleWidth = robotSize * 0.8;
        const bubbleHeight = robotSize * 0.4;
        const bubbleX = -bodyWidth - bubbleWidth / 2;
        const bubbleY = -bodyHeight / 2 - bubbleHeight / 2;
        
        // Bubble
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = colors.robot.accent;
        ctx.lineWidth = 2;
        
        // Draw bubble shape
        ctx.beginPath();
        ctx.moveTo(bubbleX, bubbleY);
        ctx.lineTo(bubbleX + bubbleWidth, bubbleY);
        ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight);
        ctx.lineTo(bubbleX + bubbleWidth * 0.3, bubbleY + bubbleHeight);
        ctx.lineTo(bubbleX + bubbleWidth * 0.1, bubbleY + bubbleHeight + bubbleHeight * 0.3);
        ctx.lineTo(bubbleX + bubbleWidth * 0.2, bubbleY + bubbleHeight);
        ctx.lineTo(bubbleX, bubbleY + bubbleHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Text in bubble
        ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
        ctx.font = `${Math.round(robotSize * 0.1)}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("Hello!", bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2);
      }
      
      ctx.restore(); // Restore after robot transformations
      
      requestAnimationFrame(animate);
    };
    
    // Helper function for drawing rounded rectangles
    function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }
    
    const animationId = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Robotic/technical background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full -z-10"
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
} 