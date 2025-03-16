import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { User, Book, Code, Database, Brain, Users } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/server/api";

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
  const { toast } = useToast();
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

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section: string, parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parent]: {
          ...prev[section][parent],
          [field]: value
        }
      }
    }));
  };

  const handleSaveSection = async (sectionId: string) => {
    try {
      const sectionData = formData[sectionId];
      await api.savePersonalInfo(sectionId, sectionData);

      toast({
        title: "Success",
        description: `${sections.find(s => s.id === sectionId)?.title} data saved successfully.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving section data:', error);
      toast({
        title: "Error",
        description: "Failed to save data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'profile':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Student Profile</h3>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.profile.fullName}
                  onChange={(e) => handleInputChange('profile', 'fullName', e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.profile.email}
                  onChange={(e) => handleInputChange('profile', 'email', e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  value={formData.profile.phone}
                  onChange={(e) => handleInputChange('profile', 'phone', e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <Label htmlFor="age">Age (Optional)</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.profile.age}
                  onChange={(e) => handleInputChange('profile', 'age', e.target.value)}
                  placeholder="Enter your age"
                />
              </div>
              <div>
                <Label htmlFor="institution">Educational Institution (Optional)</Label>
                <Input
                  id="institution"
                  value={formData.profile.institution}
                  onChange={(e) => handleInputChange('profile', 'institution', e.target.value)}
                  placeholder="Enter your institution"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleSaveSection('profile')} className="bg-primary text-white">
                  Save Profile
                </Button>
              </div>
            </div>
          </div>
        );

      case 'technical':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Technical Computing Skills</h3>
            <div className="space-y-6">
              <div>
                <Label>Comfort Level with Technical Computing Tasks</Label>
                <RadioGroup
                  value={formData.technical.technicalProficiency}
                  onValueChange={(value) => handleInputChange('technical', 'technicalProficiency', value)}
                  className="grid gap-2 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="highly" id="highly" />
                    <Label htmlFor="highly">Highly Proficient</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moderately" id="moderately" />
                    <Label htmlFor="moderately">Moderately Proficient</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="limited" id="limited" />
                    <Label htmlFor="limited">Limited Proficiency</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label>Cloud Computing Experience</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox 
                    id="cloud"
                    checked={formData.technical.cloudExperience}
                    onCheckedChange={(checked) => handleInputChange('technical', 'cloudExperience', checked)}
                  />
                  <Label htmlFor="cloud">Experience with Cloud Platforms (AWS, GCP, Azure)</Label>
                </div>
              </div>

              <div>
                <Label>Virtualization Experience</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox 
                    id="vm"
                    checked={formData.technical.vmExperience}
                    onCheckedChange={(checked) => handleInputChange('technical', 'vmExperience', checked)}
                  />
                  <Label htmlFor="vm">Experience with VMs or Containers (Docker, VMware)</Label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSaveSection('technical')} className="bg-primary text-white">
                  Save Technical Skills
                </Button>
              </div>
            </div>
          </div>
        );

      case 'programming':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Programming and Development Expertise</h3>
            
            <div>
              <Label>Programming Experience</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox 
                  id="hasProgramming"
                  checked={formData.programming.hasProgramming}
                  onCheckedChange={(checked) => handleInputChange('programming', 'hasProgramming', checked)}
                />
                <Label htmlFor="hasProgramming">I have programming experience</Label>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Programming Languages and Proficiency Levels</Label>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.programming.languages).map(([lang, value]) => (
                  <div key={lang} className="space-y-2">
                    <Label htmlFor={`lang_${lang}`}>{lang}</Label>
                    <select
                      id={`lang_${lang}`}
                      value={value}
                      onChange={(e) => handleNestedInputChange('programming', 'languages', lang, e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="">Select proficiency</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Frameworks and Libraries</Label>
              <div className="grid grid-cols-2 gap-2">
                {['React.js', 'Angular', 'Django', 'Flask', 'Node.js', 'Spring Boot'].map((framework) => (
                  <div key={framework} className="flex items-center space-x-2">
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
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Project Description (Optional)</Label>
              <Textarea
                id="projectDescription"
                value={formData.programming.projectDescription}
                onChange={(e) => handleInputChange('programming', 'projectDescription', e.target.value)}
                placeholder="Provide a brief overview of a project, including technologies used and its objective"
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => handleSaveSection('programming')} className="bg-primary text-white">
                Save Programming Skills
              </Button>
            </div>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Database and Backend Development Skills</h3>
            
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
            <h3 className="text-lg font-semibold mb-4">Emerging Technologies and Artificial Intelligence</h3>
            
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
            <h3 className="text-lg font-semibold mb-4">Collaboration and Problem-Solving</h3>
            
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
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg text-slate-800">Personal Information</h2>
          <p className="text-sm text-slate-500 mt-1">Complete your profile details</p>
        </div>
        <ScrollArea className="h-full">
          <div className="p-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {section.icon}
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <Card className="p-6">
            {renderSection(activeSection)}
          </Card>
        </div>
      </div>
    </div>
  );
} 