"use client";

import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Users } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="text-center space-y-8">
        {/* Logo Animation */}
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          <div className="relative">
            <motion.div 
              className="p-6 rounded-full bg-primary/10 border-2 border-primary/20"
              animate={{ 
                rotate: 360,
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <GraduationCap className="h-12 w-12 text-primary" />
            </motion.div>
            
            {/* Floating Icons */}
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ 
                y: [-5, 5, -5],
                rotate: [0, 10, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <BookOpen className="h-6 w-6 text-blue-500" />
            </motion.div>
            
            <motion.div
              className="absolute -bottom-2 -left-2"
              animate={{ 
                y: [5, -5, 5],
                rotate: [0, -10, 0]
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            >
              <Users className="h-6 w-6 text-green-500" />
            </motion.div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            Edu-Grade
          </h1>
          <p className="text-muted-foreground mt-2">Memuat sistem pembelajaran...</p>
        </motion.div>

        {/* Loading Dots */}
        <motion.div 
          className="flex justify-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-3 h-3 bg-primary rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2
              }}
            />
          ))}
        </motion.div>

        {/* Progress Text */}
        <motion.div
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          Mohon tunggu sebentar...
        </motion.div>
      </div>
    </div>
  );
}