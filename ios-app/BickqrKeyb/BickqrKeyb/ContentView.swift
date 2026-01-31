//
//  ContentView.swift
//  BickqrKeyb
//

import SwiftUI

struct ContentView: View {
    @State private var showBrowse = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Logo/Header
                VStack(spacing: 8) {
                    Image(systemName: "waveform.circle.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(.linearGradient(
                            colors: [.orange, .yellow],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                    
                    Text("Bickqr")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Sound Keyboard")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 40)
                
                Spacer()
                
                // Main Action Button
                Button(action: { showBrowse = true }) {
                    HStack {
                        Image(systemName: "globe")
                        Text("Browse & Add Favorites")
                    }
                    .font(.headline)
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [.orange, .yellow],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(12)
                }
                .padding(.horizontal, 24)
                
                // Instructions
                VStack(alignment: .leading, spacing: 12) {
                    Text("Setup Instructions")
                        .font(.headline)
                    
                    InstructionRow(number: "1", text: "Go to Settings → General → Keyboard")
                    InstructionRow(number: "2", text: "Tap \"Keyboards\" → \"Add New Keyboard\"")
                    InstructionRow(number: "3", text: "Select \"BickqrKeyb\"")
                    InstructionRow(number: "4", text: "Enable \"Allow Full Access\"")
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, 24)
                
                Spacer()
            }
            .navigationBarHidden(true)
        }
        .sheet(isPresented: $showBrowse) {
            BrowseView()
        }
    }
}

struct InstructionRow: View {
    let number: String
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(Color.orange)
                .clipShape(Circle())
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }
}

#Preview {
    ContentView()
}
