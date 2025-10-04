import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { floatingButton } from "@/lib/motion";
import { Button } from "./ui/button";

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

export function FloatingActionButton({ 
  onClick, 
  icon = <Plus className="h-6 w-6" />,
  label = "Add Item",
  className = ""
}: FloatingActionButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
        setIsExpanded(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className={`fixed bottom-6 right-6 z-50 ${className}`}
        >
          <motion.button
            variants={floatingButton}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            onHoverStart={() => setIsExpanded(true)}
            onHoverEnd={() => setIsExpanded(false)}
            onClick={onClick}
            className="relative bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-full shadow-lg overflow-hidden group"
            data-testid="floating-action-button"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            
            <motion.div 
              className="relative flex items-center px-5 py-4 gap-3"
              animate={{ 
                width: isExpanded ? "auto" : "56px",
                paddingLeft: isExpanded ? "20px" : "16px",
                paddingRight: isExpanded ? "20px" : "16px"
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {icon}
              </motion.div>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-semibold whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.button>

          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500/30 blur-xl -z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface FABMenuProps {
  items: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }[];
}

export function FABMenu({ items }: FABMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2"
          >
            {items.map((item, index) => (
              <motion.button
                key={index}
                initial={{ scale: 0, y: 20 }}
                animate={{ 
                  scale: 1, 
                  y: 0,
                  transition: {
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }
                }}
                exit={{ 
                  scale: 0, 
                  y: 20,
                  transition: {
                    delay: (items.length - index) * 0.05
                  }
                }}
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-3 rounded-full shadow-lg flex items-center gap-3 pr-4 group"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full">
                  {item.icon}
                </div>
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        variants={floatingButton}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-full shadow-lg flex items-center justify-center relative overflow-hidden"
      >
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          <Plus className="h-6 w-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}
