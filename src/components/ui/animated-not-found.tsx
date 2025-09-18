"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function AnimatedNotFoundIllustration() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-64 h-64 mx-auto mb-8 flex items-center justify-center">
        <div className="text-6xl">📚</div>
      </div>
    );
  }

  return (
    <div className="w-64 h-64 mx-auto mb-8 relative">
      {/* Floating Books Animation */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Book 1 */}
        <motion.div
          className="absolute text-4xl"
          initial={{ y: 20, rotate: -15 }}
          animate={{ 
            y: [20, 0, 20],
            rotate: [-15, -5, -15]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ left: "20%", top: "30%" }}
        >
          📖
        </motion.div>

        {/* Book 2 */}
        <motion.div
          className="absolute text-4xl"
          initial={{ y: -10, rotate: 10 }}
          animate={{ 
            y: [-10, 10, -10],
            rotate: [10, 20, 10]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          style={{ right: "25%", top: "20%" }}
        >
          📚
        </motion.div>

        {/* Book 3 */}
        <motion.div
          className="absolute text-4xl"
          initial={{ y: 15, rotate: -10 }}
          animate={{ 
            y: [15, -5, 15],
            rotate: [-10, 5, -10]
          }}
          transition={{ 
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          style={{ left: "35%", bottom: "25%" }}
        >
          📝
        </motion.div>

        {/* Question Mark in Center */}
        <motion.div 
          className="text-6xl z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            duration: 0.8,
            delay: 0.3,
            type: "spring",
            bounce: 0.6
          }}
        >
          ❓
        </motion.div>

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/30 rounded-full"
            initial={{ 
              x: Math.random() * 200 - 100,
              y: Math.random() * 200 - 100,
              opacity: 0
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}