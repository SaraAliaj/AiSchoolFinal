import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { User, Book, Code, Database, Brain, Users, Check, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/server/api";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface FormSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const sections: FormSection[] = [
  { id: 'profile', title: 'Student Profile', icon: <User className="w-4 h-4" /> },
  { id: 'technical', title: 'Technical Computing', icon: <Code className="w-4 h-4" /> },
  { id: 'programming', title: 'Programming Expertise', icon: <Book className="w-4 h-4" /> },
  { id: 'database', title: 'Database Skills', icon: <Database className="w-4 h-4" /> },
  { id: 'ai', title: 'AI & Emerging Tech', icon: <Brain className="w-4 h-4" /> },
  { id: 'collaboration', title: 'Collaboration', icon: <Users className="w-4 h-4" /> }
];

export default function PersonalInfoForm() {
  const [activeSection, setActiveSection] = useState('profile');
  const [showSaveAnimation, setShowSaveAnimation] = useState({ section: '', show: false });
  const [savedSections, setSavedSections] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    profile: {
      fullName: '',
      email: '',
      phone: '',
      age: '',
      institution: '',
      fieldOfStudy: '',
      yearOfStudy: '',
      linkedIn: ''
    },
    technical: {
      technicalProficiency: '',
      cloudExperience: false,
      vmExperience: false,
      otherTechnicalSkills: ''
    },
    programming: {
      hasProgramming: false,
      languages: {
        python: '',
        java: '',
        cpp: '',
        javascript: '',
        htmlCss: '',
        sql: ''
      },
      frameworks: [],
      ides: [],
      projectDescription: '',
      hasOpenSource: false
    },
    database: {
      hasDatabaseExperience: false,
      databaseSystems: [],
      otherDatabases: '',
      hasBackendExperience: false,
      apiTechnologies: ''
    },
    ai: {
      aiExperience: 'none',
      hasML: false,
      tools: [],
      otherTools: '',
      hasAIModels: false
    },
    collaboration: {
      hasCollaboration: false,
      collaborationRole: '',
      hasCompetitions: false,
      competitionExperience: '',
      additionalInfo: ''
    }
  });

  // Load data from localStorage when component mounts
  useEffect(() => {
    const loadLocalData = () => {
      try {
        const savedData = localStorage.getItem('personalInfo');
        if (savedData) {
          setFormData(JSON.parse(savedData));
        }
        
        // Get saved sections from localStorage
        const saved = localStorage.getItem('savedSections');
        if (saved) {
          setSavedSections(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading local data:', error);
      }
      setIsLoading(false);
    };

    loadLocalData();
  }, []);

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
      // Save to localStorage whenever data changes
      localStorage.setItem('personalInfo', JSON.stringify(newData));
      return newData;
    });
  };

  const handleNestedInputChange = (section: string, parent: string, field: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [section]: {
          ...prev[section],
          [parent]: {
            ...prev[section][parent],
            [field]: value
          }
        }
      };
      // Save to localStorage whenever data changes
      localStorage.setItem('personalInfo', JSON.stringify(newData));
      return newData;
    });
  };

  const handleSaveSection = async (sectionId: string) => {
    try {
      const sectionData = formData[sectionId];
      
      // Show save animation
      setShowSaveAnimation({ section: sectionId, show: true });
      
      // Save to both API and localStorage
      await api.savePersonalInfo(sectionId, sectionData);
      localStorage.setItem('personalInfo', JSON.stringify(formData));
      
      // Add section to savedSections and store in localStorage
      const updatedSavedSections = [...savedSections, sectionId];
      setSavedSections(updatedSavedSections);
      localStorage.setItem('savedSections', JSON.stringify(updatedSavedSections));
      
      // Hide save animation after 1.5 seconds
      setTimeout(() => {
        setShowSaveAnimation({ section: '', show: false });
      }, 1500);
      
    } catch (error) {
      console.error('Error saving section data:', error);
      toast({
        title: "Error",
        description: "Failed to save data to server, but your changes are saved locally.",
        variant: "destructive"
      });
      setShowSaveAnimation({ section: '', show: false });
    }
  };

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'profile':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <motion.h3 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="text-lg font-semibold flex items-center"
              >
                <User className="w-5 h-5 mr-2 text-primary" /> 
                Student Profile
              </motion.h3>
              {(showSaveAnimation.section === 'profile' && showSaveAnimation.show || savedSections.includes('profile')) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm font-medium"
                >
                  <Check className="w-4 h-4 mr-1" /> Saved
                </motion.div>
              )}
            </div>
            <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
            <div className="grid gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.profile.fullName}
                  onChange={(e) => handleInputChange('profile', 'fullName', e.target.value)}
                  placeholder="Enter your full name"
                  required
                    className="mt-1 transition-all focus:ring-2 focus:ring-primary/30"
                  />
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.profile.email}
                  onChange={(e) => handleInputChange('profile', 'email', e.target.value)}
                  placeholder="Enter your email address"
                  required
                    className="mt-1 transition-all focus:ring-2 focus:ring-primary/30"
                  />
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  value={formData.profile.phone}
                  onChange={(e) => handleInputChange('profile', 'phone', e.target.value)}
                  placeholder="Enter your phone number"
                    className="mt-1 transition-all focus:ring-2 focus:ring-primary/30"
                  />
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                <Label htmlFor="age">Age (Optional)</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.profile.age}
                  onChange={(e) => handleInputChange('profile', 'age', e.target.value)}
                  placeholder="Enter your age"
                    className="mt-1 transition-all focus:ring-2 focus:ring-primary/30"
                  />
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                <Label htmlFor="institution">Educational Institution (Optional)</Label>
                <Input
                  id="institution"
                  value={formData.profile.institution}
                  onChange={(e) => handleInputChange('profile', 'institution', e.target.value)}
                  placeholder="Enter your institution"
                    className="mt-1 transition-all focus:ring-2 focus:ring-primary/30"
                />
                </motion.div>
              </div>
            </ScrollArea>
            
            <div className="flex justify-end pt-4 border-t mt-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={() => handleSaveSection('profile')} 
                  className="bg-primary text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  Save Profile
                </Button>
              </motion.div>
            </div>
          </div>
        );

      case 'technical':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <motion.h3 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="text-lg font-semibold flex items-center"
              >
                <Code className="w-5 h-5 mr-2 text-primary" /> 
                Technical Computing Skills
              </motion.h3>
              {(showSaveAnimation.section === 'technical' && showSaveAnimation.show || savedSections.includes('technical')) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm font-medium"
                >
                  <Check className="w-4 h-4 mr-1" /> Saved
                </motion.div>
              )}
            </div>
            
            <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
            <div className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm"
                >
                  <Label className="font-medium mb-3 block">Comfort Level with Technical Computing Tasks</Label>
                <RadioGroup
                  value={formData.technical.technicalProficiency}
                  onValueChange={(value) => handleInputChange('technical', 'technicalProficiency', value)}
                  className="grid gap-2 mt-2"
                >
                    <div className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-md transition-colors">
                    <RadioGroupItem value="highly" id="highly" />
                    <Label htmlFor="highly">Highly Proficient</Label>
                  </div>
                    <div className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-md transition-colors">
                    <RadioGroupItem value="moderately" id="moderately" />
                    <Label htmlFor="moderately">Moderately Proficient</Label>
                  </div>
                    <div className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-md transition-colors">
                    <RadioGroupItem value="limited" id="limited" />
                    <Label htmlFor="limited">Limited Proficiency</Label>
                  </div>
                </RadioGroup>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm"
                >
                  <Label className="font-medium mb-3 block">Cloud Computing Experience</Label>
                  <div className="flex items-center space-x-2 mt-2 p-2 hover:bg-slate-100 rounded-md transition-colors">
                  <Checkbox 
                    id="cloud"
                    checked={formData.technical.cloudExperience}
                    onCheckedChange={(checked) => handleInputChange('technical', 'cloudExperience', checked)}
                  />
                  <Label htmlFor="cloud">Experience with Cloud Platforms (AWS, GCP, Azure)</Label>
                </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm"
                >
                  <Label className="font-medium mb-3 block">Virtualization Experience</Label>
                  <div className="flex items-center space-x-2 mt-2 p-2 hover:bg-slate-100 rounded-md transition-colors">
                  <Checkbox 
                    id="vm"
                    checked={formData.technical.vmExperience}
                    onCheckedChange={(checked) => handleInputChange('technical', 'vmExperience', checked)}
                  />
                  <Label htmlFor="vm">Experience with VMs or Containers (Docker, VMware)</Label>
                </div>
                </motion.div>
              </div>
            </ScrollArea>

            <div className="flex justify-end pt-4 border-t mt-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={() => handleSaveSection('technical')} 
                  className="bg-primary text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  Save Technical Skills
                </Button>
              </motion.div>
            </div>
          </div>
        );

      case 'programming':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <motion.h3 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="text-lg font-semibold flex items-center"
              >
                <Book className="w-5 h-5 mr-2 text-primary" /> 
                Programming and Development Expertise
              </motion.h3>
              {(showSaveAnimation.section === 'programming' && showSaveAnimation.show || savedSections.includes('programming')) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm font-medium"
                >
                  <Check className="w-4 h-4 mr-1" /> Saved
                </motion.div>
              )}
            </div>
            
            <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
              <div className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm"
                >
                  <Label className="font-medium mb-3 block">Programming Experience</Label>
                  <div className="flex items-center space-x-2 mt-2 p-2 hover:bg-slate-100 rounded-md transition-colors">
                <Checkbox 
                  id="hasProgramming"
                  checked={formData.programming.hasProgramming}
                  onCheckedChange={(checked) => handleInputChange('programming', 'hasProgramming', checked)}
                />
                <Label htmlFor="hasProgramming">I have programming experience</Label>
              </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm"
                >
                  <Label className="font-medium mb-3 block">Programming Languages and Proficiency Levels</Label>
              <div className="grid grid-cols-2 gap-4">
                    {Object.entries(formData.programming.languages).map(([lang, value], index) => (
                      <motion.div 
                        key={lang} 
                        className="space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (index * 0.05) }}
                      >
                        <Label htmlFor={`lang_${lang}`} className="capitalize">{lang}</Label>
                    <select
                      id={`lang_${lang}`}
                      value={value}
                      onChange={(e) => handleNestedInputChange('programming', 'languages', lang, e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/30 transition-all"
                    >
                      <option value="">Select proficiency</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm"
                >
                  <Label className="font-medium mb-3 block">Frameworks and Libraries</Label>
              <div className="grid grid-cols-2 gap-2">
                    {['React.js', 'Angular', 'Django', 'Flask', 'Node.js', 'Spring Boot'].map((framework, index) => (
                      <motion.div 
                        key={framework} 
                        className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-md transition-colors"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (index * 0.05) }}
                      >
                    <Checkbox 
                      id={`framework_${framework}`}
                      checked={formData.programming.frameworks.includes(framework)}
                      onCheckedChange={(checked) => {
                        const newFrameworks = checked 
                          ? [...formData.programming.frameworks, framework]
                          : formData.programming.frameworks.filter(f => f !== framework);
                        handleInputChange('programming', 'frameworks', newFrameworks);
                      }}
                    />
                    <Label htmlFor={`framework_${framework}`}>{framework}</Label>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm"
                >
                  <Label htmlFor="projectDescription" className="font-medium mb-3 block">Project Description (Optional)</Label>
              <Textarea
                id="projectDescription"
                value={formData.programming.projectDescription}
                onChange={(e) => handleInputChange('programming', 'projectDescription', e.target.value)}
                placeholder="Provide a brief overview of a project, including technologies used and its objective"
                    className="min-h-[100px] focus:ring-2 focus:ring-primary/30 transition-all"
              />
                </motion.div>
            </div>
            </ScrollArea>

            <div className="flex justify-end pt-4 border-t mt-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={() => handleSaveSection('programming')} 
                  className="bg-primary text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                Save Programming Skills
              </Button>
              </motion.div>
            </div>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <motion.h3 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="text-lg font-semibold flex items-center"
              >
                <Database className="w-5 h-5 mr-2 text-primary" /> 
                Database and Backend Development Skills
              </motion.h3>
              {(showSaveAnimation.section === 'database' && showSaveAnimation.show || savedSections.includes('database')) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm font-medium"
                >
                  <Check className="w-4 h-4 mr-1" /> Saved
                </motion.div>
              )}
            </div>
            
            <div>
              <Label>Database Experience</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox 
                  id="hasDatabase"
                  checked={formData.database.hasDatabaseExperience}
                  onCheckedChange={(checked) => handleInputChange('database', 'hasDatabaseExperience', checked)}
                />
                <Label htmlFor="hasDatabase">I have experience with database systems</Label>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Database Management Systems</Label>
              <div className="grid grid-cols-2 gap-2">
                {['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Firebase'].map((db) => (
                  <div key={db} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`db_${db}`}
                      checked={formData.database.databaseSystems.includes(db)}
                      onCheckedChange={(checked) => {
                        const newDatabases = checked 
                          ? [...formData.database.databaseSystems, db]
                          : formData.database.databaseSystems.filter(d => d !== db);
                        handleInputChange('database', 'databaseSystems', newDatabases);
                      }}
                    />
                    <Label htmlFor={`db_${db}`}>{db}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiTechnologies">API Development Technologies (Optional)</Label>
              <Textarea
                id="apiTechnologies"
                value={formData.database.apiTechnologies}
                onChange={(e) => handleInputChange('database', 'apiTechnologies', e.target.value)}
                placeholder="List technologies used (e.g., REST, GraphQL, Express.js, FastAPI)"
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => handleSaveSection('database')} className="bg-primary text-white">
                Save Database Skills
              </Button>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <motion.h3 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="text-lg font-semibold flex items-center"
              >
                <Brain className="w-5 h-5 mr-2 text-primary" /> 
                Emerging Technologies and Artificial Intelligence
              </motion.h3>
              {(showSaveAnimation.section === 'ai' && showSaveAnimation.show || savedSections.includes('ai')) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm font-medium"
                >
                  <Check className="w-4 h-4 mr-1" /> Saved
                </motion.div>
              )}
            </div>
            
            <div className="space-y-4">
              <Label>AI Experience Level</Label>
              <RadioGroup
                value={formData.ai.aiExperience}
                onValueChange={(value) => handleInputChange('ai', 'aiExperience', value)}
                className="grid gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="practical" id="ai-practical" />
                  <Label htmlFor="ai-practical">Yes, with practical application in projects</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="theoretical" id="ai-theoretical" />
                  <Label htmlFor="ai-theoretical">Yes, theoretical understanding only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="ai-none" />
                  <Label htmlFor="ai-none">No experience</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label>AI/ML Tools and Libraries</Label>
              <div className="grid grid-cols-2 gap-2">
                {['TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas'].map((tool) => (
                  <div key={tool} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`tool_${tool}`}
                      checked={formData.ai.tools.includes(tool)}
                      onCheckedChange={(checked) => {
                        const newTools = checked 
                          ? [...formData.ai.tools, tool]
                          : formData.ai.tools.filter(t => t !== tool);
                        handleInputChange('ai', 'tools', newTools);
                      }}
                    />
                    <Label htmlFor={`tool_${tool}`}>{tool}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => handleSaveSection('ai')} className="bg-primary text-white">
                Save AI Skills
              </Button>
            </div>
          </div>
        );

      case 'collaboration':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <motion.h3 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="text-lg font-semibold flex items-center"
              >
                <Users className="w-5 h-5 mr-2 text-primary" /> 
                Collaboration and Problem-Solving
              </motion.h3>
              {(showSaveAnimation.section === 'collaboration' && showSaveAnimation.show || savedSections.includes('collaboration')) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm font-medium"
                >
                  <Check className="w-4 h-4 mr-1" /> Saved
                </motion.div>
              )}
            </div>
            
            <div>
              <Label>Team Projects</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox 
                  id="hasCollaboration"
                  checked={formData.collaboration.hasCollaboration}
                  onCheckedChange={(checked) => handleInputChange('collaboration', 'hasCollaboration', checked)}
                />
                <Label htmlFor="hasCollaboration">I have experience with collaborative projects</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collaborationRole">Role in Collaborative Projects (Optional)</Label>
              <Textarea
                id="collaborationRole"
                value={formData.collaboration.collaborationRole}
                onChange={(e) => handleInputChange('collaboration', 'collaborationRole', e.target.value)}
                placeholder="Describe your responsibilities in collaborative projects"
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label>Competitions</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox 
                  id="hasCompetitions"
                  checked={formData.collaboration.hasCompetitions}
                  onCheckedChange={(checked) => handleInputChange('collaboration', 'hasCompetitions', checked)}
                />
                <Label htmlFor="hasCompetitions">I have participated in programming competitions or hackathons</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitionExperience">Competition/Hackathon Experience (Optional)</Label>
              <Textarea
                id="competitionExperience"
                value={formData.collaboration.competitionExperience}
                onChange={(e) => handleInputChange('collaboration', 'competitionExperience', e.target.value)}
                placeholder="Summarize your participation and outcomes"
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => handleSaveSection('collaboration')} className="bg-primary text-white">
                Save Collaboration Info
              </Button>
            </div>
          </div>
        );

      default:
        return <div>Section under construction</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 p-6 gap-6">
      {/* Sidebar wrapper div - full height */}
      <div className="w-64 h-[calc(100vh-3rem)] overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200"
        >
          {/* Sidebar header */}
          <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent rounded-t-xl">
            <h2 className="font-semibold text-lg text-slate-800">Personal Information</h2>
            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-xs text-blue-700">
                <strong>Disclaimer:</strong> Student-entered info may be accessible to others via the chatbot. Students can edit or update their info anytime.
              </p>
            </div>
          </div>
          
          {/* Sidebar navigation */}
          <ScrollArea className="flex-1">
            <div className="p-3">
              {sections.map((section) => (
                <motion.button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {section.icon}
                    <span>{section.title}</span>
                  </div>
                  {activeSection === section.id && (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </motion.div>
      </div>

      {/* Content wrapper div - full height */}
      <div className="flex-1 h-[calc(100vh-3rem)] overflow-hidden">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full p-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto relative"
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-slate-600">Loading your information...</p>
              </div>
            </div>
          ) : (
            renderSection(activeSection)
          )}
        </motion.div>
      </div>
    </div>
  );
} 