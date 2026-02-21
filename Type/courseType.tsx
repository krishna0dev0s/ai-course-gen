export type Course = {
    courseId: string;
    couurseName: string;
    type: string;
    createdAt: Date;
    id: number;
    courseLayout: courseLayout;
    chapterContentSlides: chapterContentSlide[];
}
export type chapter = {
    chapterId: string;
    chapterTitle: string;
    subContent: string[];
}

export type courseLayout = {
    courseName: string;
    courseDescription: string;
    courseId: string;
    level: string;
    totalChapters: number;
    chapters: chapter[];

}
export type chapterContentSlide = {
    id: number;
    courseId: string;
    chapterId: string;
    slideId: string;
    slideIndex: number;
    audioFileName: string;
    narration: {
        fullText: string;
    };
    html: string;
    revelData: string[];
}
