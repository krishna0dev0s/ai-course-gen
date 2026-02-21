"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group"
import TextareaAutosize from "react-textarea-autosize"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Send, Loader2 } from 'lucide-react'
import { QUICK_VIDEO_SUGGESTIONS } from '@/data/constant'
import axios from 'axios'
import { toast } from 'sonner'
import DecryptedText from '@/components/DecryptedText'


const Hero = () => {
  const [input, setInput] = useState("");
  const[type,setType] = useState("full-course");
  const [loading,setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const {user}=useUser();
  const { openSignIn } = useClerk();
  const route = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const GenrateCourseLayout=async()=>{
    if (!input.trim()) {
      toast.error("Please enter a course idea first");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Generating course layout...");
    const clientCourseId = crypto.randomUUID();
    try {
      const result = await axios.post("/api/genrate-course-layout", {
        userInput: input,
        type,
        courseId: clientCourseId
      });
      const createdCourseId = (result.data as { courseId?: string } | undefined)?.courseId;
      if (!createdCourseId) {
        const message = (result.data as { error?: string } | undefined)?.error;
        toast.error(message || "Course could not be created. Please try again.", { id: toastId });
        return;
      }

      toast.success("Course layout generated", { id: toastId });
      route.push(`/course/${createdCourseId}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { error?: string } | undefined)?.error;
        toast.error(message || "Failed to generate course layout", { id: toastId });
      } else {
        toast.error("Failed to generate course layout", { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="min-h-[calc(100vh-80px)] bg-transparent">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-6xl -translate-y-8 flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          <DecryptedText
            text="✨ Welcome to VidAI Course Generator"
            speed={60}
            maxIterations={10}
            characters="ABCD1234!?"
            className="text-white"
            encryptedClassName="text-white/60"
            animateOn="view"
            revealDirection="start"
            sequential
            useOriginalCharsOnly={false}
          />
        </h1>
        <p className="mx-auto max-w-2xl text-base text-white/80 md:text-lg">
          Create engaging and interactive AI-powered courses in minutes. No coding required.
        </p>

      <div className="w-full max-w-2xl rounded-xl border border-white/20 bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(120,80,255,0.25)]">
        <InputGroup className="animate-[inputShadow_4s_ease-in-out_infinite]">
          <TextareaAutosize
            data-slot="input-group-control"
            className="flex field-sizing-content min-h-16 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base text-white placeholder:text-white/50 transition-[color,box-shadow] outline-none md:text-sm"
            placeholder="Describe your course idea..."
            value={input}
            onChange={(e)=>setInput(e.target.value)}
          />
          <InputGroupAddon align="block-end">
            {mounted ? (
              <Select value={type} onValueChange={(value)=>setType(value)}>
                <SelectTrigger className="w-45 border-white/30 bg-white/10 text-white">
                  <SelectValue placeholder="Course Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="full-course">Full course</SelectItem>
                    <SelectItem value="quick-explain">Quick explain videos</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <div className="w-45 h-9 rounded-md border border-input bg-background/60" />
            )}
            {user ? (
              <InputGroupButton className="ml-auto" size="sm" variant="default" onClick={GenrateCourseLayout} disabled={loading}>
                {loading ? <Loader2 className='animate-spin' /> : <Send />}
              </InputGroupButton>
            ) : (
              <InputGroupButton
                className="ml-auto"
                size="sm"
                variant="default"
                onClick={() => openSignIn()}
              >
                <Send />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className='flex gap-5 mt-5 max-w-3xl flex-wrap justify-center'>
        {QUICK_VIDEO_SUGGESTIONS.map((suggestion,index)=>(
            <h2
              key={index} onClick={()=>setInput(suggestion?.prompt)}
              className='border border-white/20 rounded-2xl px-2 p-1 text-sm text-white bg-white/10 backdrop-blur-sm animate-[inputShadow_5s_ease-in-out_infinite]'
            >
              {suggestion.title}
            </h2>
        ))}
      </div>
      </div>
    </section>
  )
}

export default Hero