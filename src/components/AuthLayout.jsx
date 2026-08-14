import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children, heroImage }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {heroImage ? (
            <img
              src={heroImage.src}
              alt={heroImage.alt}
              className="mx-auto mb-5 h-28 w-28 rounded-2xl object-cover shadow-sm ring-1 ring-border sm:h-32 sm:w-32"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
            </div>
          )}
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">PurrTask Daily</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
